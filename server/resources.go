package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"time"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/blanketops/environments-server/internal/types"
)

// lookupKind resolves the {kind} path segment, writing a 400 for an unknown
// one.
func lookupKind(w http.ResponseWriter, r *http.Request) (string, kindInfo, bool) {
	plural := r.PathValue("kind")
	info, ok := kinds[plural]
	if !ok {
		writeErr(w, http.StatusBadRequest, fmt.Sprintf("unknown kind: %s", plural), "BadRequest")
	}
	return plural, info, ok
}

// requireClient writes a 503 when the server has no cluster connection.
func requireClient(w http.ResponseWriter, k8s client.Client) bool {
	if k8s == nil {
		writeErr(w, http.StatusServiceUnavailable, "Kubernetes client not initialized", "Unavailable")
		return false
	}
	return true
}

// writeK8sErr maps a Kubernetes client error to an HTTP status. A kind whose
// CRD is not installed is a 404 NotInstalled, so the UI can say so instead of
// showing a server error.
func writeK8sErr(w http.ResponseWriter, err error, info kindInfo) {
	var status int
	var reason string
	switch {
	case meta.IsNoMatchError(err):
		writeErr(w, http.StatusNotFound,
			fmt.Sprintf("%s (%s) is not installed in the cluster", info.GVK.Kind, info.GVK.GroupVersion()),
			"NotInstalled")
		return
	case apierrors.IsNotFound(err):
		status, reason = http.StatusNotFound, "NotFound"
	case apierrors.IsAlreadyExists(err):
		status, reason = http.StatusConflict, "AlreadyExists"
	case apierrors.IsConflict(err):
		status, reason = http.StatusConflict, "Conflict"
	case apierrors.IsInvalid(err), apierrors.IsBadRequest(err):
		status, reason = http.StatusUnprocessableEntity, "Invalid"
	case apierrors.IsForbidden(err):
		status, reason = http.StatusForbidden, "Forbidden"
	case apierrors.IsUnauthorized(err):
		status, reason = http.StatusUnauthorized, "Unauthorized"
	default:
		status, reason = http.StatusInternalServerError, "InternalServerError"
	}
	writeErr(w, status, err.Error(), reason)
}

func newObject(info kindInfo, ns, name string) *unstructured.Unstructured {
	u := &unstructured.Unstructured{}
	u.SetGroupVersionKind(info.GVK)
	u.SetNamespace(ns)
	u.SetName(name)
	return u
}

// setContract sets spec.contract from the request's raw spec JSON.
func setContract(u *unstructured.Unstructured, raw json.RawMessage) error {
	var contract any
	if err := json.Unmarshal(raw, &contract); err != nil {
		return fmt.Errorf("invalid spec: %w", err)
	}
	return unstructured.SetNestedField(u.Object, contract, "spec", "contract")
}

// ── List ──────────────────────────────────────────────────────────────────

func handleList(k8s client.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, info, ok := lookupKind(w, r)
		if !ok || !requireClient(w, k8s) {
			return
		}
		list := &unstructured.UnstructuredList{}
		list.SetGroupVersionKind(info.GVK.GroupVersion().WithKind(info.GVK.Kind + "List"))
		var opts []client.ListOption
		if ns := r.URL.Query().Get("namespace"); ns != "" {
			opts = append(opts, client.InNamespace(ns))
		}
		if err := k8s.List(r.Context(), list, opts...); err != nil {
			writeK8sErr(w, err, info)
			return
		}
		items := make([]types.CRStatus, len(list.Items))
		for i := range list.Items {
			items[i] = toStatus(&list.Items[i], info)
		}
		writeJSON(w, http.StatusOK, types.ListResponse{
			Items: items, Total: len(items),
			ResourceVersion: list.GetResourceVersion(), Continue: list.GetContinue(),
		})
	}
}

// ── Get ───────────────────────────────────────────────────────────────────

func handleGet(k8s client.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, info, ok := lookupKind(w, r)
		if !ok || !requireClient(w, k8s) {
			return
		}
		u := newObject(info, r.PathValue("ns"), r.PathValue("name"))
		if err := k8s.Get(r.Context(), client.ObjectKeyFromObject(u), u); err != nil {
			writeK8sErr(w, err, info)
			return
		}
		writeJSON(w, http.StatusOK, toStatus(u, info))
	}
}

// ── Create ────────────────────────────────────────────────────────────────

func handleCreate(k8s client.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		plural, info, ok := lookupKind(w, r)
		if !ok || !requireClient(w, k8s) {
			return
		}
		body, err := decode[types.CreateBody](r)
		if err != nil {
			writeErr(w, http.StatusBadRequest, err.Error(), "BadRequest")
			return
		}
		ns := r.URL.Query().Get("namespace")
		if ns == "" {
			ns = body.Metadata.Namespace
		}
		if ns == "" {
			ns = "default"
		}
		name := body.Metadata.Name
		if name == "" {
			name = fmt.Sprintf("%s-%d", plural, time.Now().UnixMilli())
		}
		u := newObject(info, ns, name)
		u.SetLabels(body.Metadata.Labels)
		u.SetAnnotations(body.Metadata.Annotations)
		if len(body.Spec) > 0 {
			if err := setContract(u, body.Spec); err != nil {
				writeErr(w, http.StatusBadRequest, err.Error(), "BadRequest")
				return
			}
		}
		if err := k8s.Create(r.Context(), u); err != nil {
			writeK8sErr(w, err, info)
			return
		}
		writeJSON(w, http.StatusCreated, toStatus(u, info))
	}
}

// ── Patch ─────────────────────────────────────────────────────────────────

// handlePatch replaces spec.contract with the request's spec (when given) and
// merges labels and annotations. It sends a merge patch computed against the
// current object, so keys dropped from the contract are removed.
func handlePatch(k8s client.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, info, ok := lookupKind(w, r)
		if !ok || !requireClient(w, k8s) {
			return
		}
		body, err := decode[types.PatchBody](r)
		if err != nil {
			writeErr(w, http.StatusBadRequest, err.Error(), "BadRequest")
			return
		}
		u := newObject(info, r.PathValue("ns"), r.PathValue("name"))
		if err := k8s.Get(r.Context(), client.ObjectKeyFromObject(u), u); err != nil {
			writeK8sErr(w, err, info)
			return
		}
		original := u.DeepCopy()
		if len(body.Spec) > 0 {
			if err := setContract(u, body.Spec); err != nil {
				writeErr(w, http.StatusBadRequest, err.Error(), "BadRequest")
				return
			}
		}
		if body.Metadata != nil {
			u.SetLabels(mergeMap(u.GetLabels(), body.Metadata.Labels))
			u.SetAnnotations(mergeMap(u.GetAnnotations(), body.Metadata.Annotations))
		}
		if err := k8s.Patch(r.Context(), u, client.MergeFrom(original)); err != nil {
			writeK8sErr(w, err, info)
			return
		}
		writeJSON(w, http.StatusOK, toStatus(u, info))
	}
}

func mergeMap(into, from map[string]string) map[string]string {
	if len(from) == 0 {
		return into
	}
	if into == nil {
		into = make(map[string]string, len(from))
	}
	for k, v := range from {
		into[k] = v
	}
	return into
}

// ── Delete ────────────────────────────────────────────────────────────────

func handleDelete(k8s client.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		plural, info, ok := lookupKind(w, r)
		if !ok || !requireClient(w, k8s) {
			return
		}
		ns, name := r.PathValue("ns"), r.PathValue("name")
		if err := k8s.Delete(r.Context(), newObject(info, ns, name)); err != nil {
			writeK8sErr(w, err, info)
			return
		}
		writeJSON(w, http.StatusOK, types.DeleteResponse{Name: name, Namespace: ns, Kind: plural, Deleted: true})
	}
}

// ── Events ────────────────────────────────────────────────────────────────

// handleEvents returns the Kubernetes events recorded for the resource,
// oldest first.
func handleEvents(k8s client.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, info, ok := lookupKind(w, r)
		if !ok || !requireClient(w, k8s) {
			return
		}
		var list corev1.EventList
		err := k8s.List(r.Context(), &list,
			client.InNamespace(r.PathValue("ns")),
			client.MatchingFields{
				"involvedObject.name": r.PathValue("name"),
				"involvedObject.kind": info.GVK.Kind,
			})
		if err != nil {
			writeK8sErr(w, err, info)
			return
		}
		writeJSON(w, http.StatusOK, toEvents(list.Items))
	}
}

func toEvents(items []corev1.Event) []types.CREvent {
	out := make([]types.CREvent, 0, len(items))
	for _, e := range items {
		first, last := e.FirstTimestamp.Time, e.LastTimestamp.Time
		if first.IsZero() {
			first = e.EventTime.Time
		}
		if last.IsZero() {
			last = first
		}
		count := int(e.Count)
		if count == 0 {
			count = 1
		}
		out = append(out, types.CREvent{
			Type: e.Type, Reason: e.Reason, Message: e.Message, Count: count,
			FirstTime: formatTime(first), LastTime: formatTime(last),
		})
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].LastTime < out[j].LastTime })
	return out
}

func formatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.RFC3339)
}

// ── Status conversion ─────────────────────────────────────────────────────

func toStatus(u *unstructured.Unstructured, info kindInfo) types.CRStatus {
	conds := conditionsOf(u)
	annotations := u.GetAnnotations()
	if annotations == nil {
		annotations = map[string]string{}
	}
	if info.annotate != nil {
		if cs, ok, _ := unstructured.NestedMap(u.Object, "status", "contract"); ok {
			info.annotate(cs, annotations)
		}
	}
	var spec json.RawMessage
	if contract, ok, _ := unstructured.NestedFieldNoCopy(u.Object, "spec", "contract"); ok {
		if raw, err := json.Marshal(contract); err == nil {
			spec = raw
		}
	}
	return types.CRStatus{
		Name: u.GetName(), Namespace: u.GetNamespace(), Kind: info.GVK.Kind,
		Phase: info.phaseOf(conds), Generation: u.GetGeneration(),
		Labels: u.GetLabels(), Annotations: annotations, Conditions: conds,
		Events: []types.CREvent{}, Spec: spec,
	}
}

func conditionsOf(u *unstructured.Unstructured) []types.Condition {
	raw, ok, _ := unstructured.NestedSlice(u.Object, "status", "conditions")
	if !ok {
		return []types.Condition{}
	}
	conds := make([]types.Condition, 0, len(raw))
	for _, item := range raw {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		c := types.Condition{
			Type:               str(m["type"]),
			Status:             str(m["status"]),
			Reason:             str(m["reason"]),
			Message:            str(m["message"]),
			LastTransitionTime: str(m["lastTransitionTime"]),
		}
		if g, ok := m["observedGeneration"].(int64); ok {
			c.ObservedGeneration = &g
		}
		conds = append(conds, c)
	}
	return conds
}

func str(v any) string {
	s, _ := v.(string)
	return s
}
