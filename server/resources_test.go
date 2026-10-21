package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"

	"github.com/blanketops/environments-server/internal/types"
)

// installedKinds are the kinds environments-install ships. The supply-chain
// kinds are left out of the fake cluster on purpose, to exercise NotInstalled.
var installedKinds = []string{
	"environments", "builds", "packages", "serviceunits", "deployments",
	"routes", "domains", "gitrepositories", "githubevents",
}

func newFakeClient(t *testing.T, objs ...client.Object) client.Client {
	t.Helper()
	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	mapper := meta.NewDefaultRESTMapper(nil)
	mapper.Add(corev1.SchemeGroupVersion.WithKind("Event"), meta.RESTScopeNamespace)
	for _, plural := range installedKinds {
		gvk := kinds[plural].GVK
		scheme.AddKnownTypeWithName(gvk, &unstructured.Unstructured{})
		scheme.AddKnownTypeWithName(gvk.GroupVersion().WithKind(gvk.Kind+"List"), &unstructured.UnstructuredList{})
		mapper.Add(gvk, meta.RESTScopeNamespace)
	}
	return fake.NewClientBuilder().
		WithScheme(scheme).
		WithRESTMapper(mapper).
		WithObjects(objs...).
		// The fake client serves any unstructured kind, so it never fails
		// the way a real client does for a kind whose CRD is absent. Return
		// the real client's error (meta.NoKindMatchError) for kinds the
		// mapper does not know.
		WithInterceptorFuncs(interceptor.Funcs{
			Get: func(ctx context.Context, c client.WithWatch, key client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
				if err := requireMapped(mapper, obj); err != nil {
					return err
				}
				return c.Get(ctx, key, obj, opts...)
			},
			List: func(ctx context.Context, c client.WithWatch, list client.ObjectList, opts ...client.ListOption) error {
				if err := requireMapped(mapper, list); err != nil {
					return err
				}
				return c.List(ctx, list, opts...)
			},
			Create: func(ctx context.Context, c client.WithWatch, obj client.Object, opts ...client.CreateOption) error {
				if err := requireMapped(mapper, obj); err != nil {
					return err
				}
				return c.Create(ctx, obj, opts...)
			},
			Delete: func(ctx context.Context, c client.WithWatch, obj client.Object, opts ...client.DeleteOption) error {
				if err := requireMapped(mapper, obj); err != nil {
					return err
				}
				return c.Delete(ctx, obj, opts...)
			},
		}).
		WithIndex(&corev1.Event{}, "involvedObject.name", func(o client.Object) []string {
			return []string{o.(*corev1.Event).InvolvedObject.Name}
		}).
		WithIndex(&corev1.Event{}, "involvedObject.kind", func(o client.Object) []string {
			return []string{o.(*corev1.Event).InvolvedObject.Kind}
		}).
		Build()
}

// requireMapped returns the mapper's NoKindMatchError for an unstructured
// object or list whose kind the mapper does not know.
func requireMapped(mapper meta.RESTMapper, obj runtime.Object) error {
	u, ok := obj.(runtime.Unstructured)
	if !ok {
		return nil
	}
	gvk := u.GetObjectKind().GroupVersionKind()
	if _, isList := obj.(*unstructured.UnstructuredList); isList {
		gvk.Kind = strings.TrimSuffix(gvk.Kind, "List")
	}
	_, err := mapper.RESTMapping(gvk.GroupKind(), gvk.Version)
	return err
}

func do(t *testing.T, h http.Handler, method, path string, body any) (*httptest.ResponseRecorder, map[string]any) {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatal(err)
		}
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(method, path, &buf))
	var out map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return rec, out
}

func TestEveryInstalledKindRoundTrips(t *testing.T) {
	h := newMux(newFakeClient(t), "")
	for _, plural := range installedKinds {
		t.Run(plural, func(t *testing.T) {
			base := "/api/v1/" + plural
			item := base + "/team-a/demo"

			rec, got := do(t, h, http.MethodPost, base+"?namespace=team-a", map[string]any{
				"metadata": map[string]any{"name": "demo", "labels": map[string]string{"tier": "dev"}},
				"spec":     map[string]any{"image": "app:1", "replicas": 1},
			})
			if rec.Code != http.StatusCreated {
				t.Fatalf("create: %d %s", rec.Code, rec.Body)
			}
			if got["kind"] != kinds[plural].GVK.Kind || got["namespace"] != "team-a" {
				t.Fatalf("create returned kind=%v namespace=%v", got["kind"], got["namespace"])
			}

			rec, got = do(t, h, http.MethodGet, item, nil)
			if rec.Code != http.StatusOK {
				t.Fatalf("get: %d %s", rec.Code, rec.Body)
			}
			if want := map[string]any{"image": "app:1", "replicas": float64(1)}; !reflect.DeepEqual(got["spec"], want) {
				t.Fatalf("get spec = %v, want %v", got["spec"], want)
			}
			if got["phase"] != types.PhaseUnknown {
				t.Fatalf("phase without conditions = %v, want Unknown", got["phase"])
			}

			rec, got = do(t, h, http.MethodGet, base+"?namespace=team-a", nil)
			if rec.Code != http.StatusOK || got["total"] != float64(1) {
				t.Fatalf("list: %d total=%v %s", rec.Code, got["total"], rec.Body)
			}
			rec, got = do(t, h, http.MethodGet, base+"?namespace=other", nil)
			if rec.Code != http.StatusOK || got["total"] != float64(0) {
				t.Fatalf("list in another namespace: %d total=%v", rec.Code, got["total"])
			}

			// The patch replaces the contract (replicas is dropped) and
			// merges labels.
			rec, _ = do(t, h, http.MethodPatch, item, map[string]any{
				"metadata": map[string]any{"labels": map[string]string{"owner": "neo"}},
				"spec":     map[string]any{"image": "app:2"},
			})
			if rec.Code != http.StatusOK {
				t.Fatalf("patch: %d %s", rec.Code, rec.Body)
			}
			_, got = do(t, h, http.MethodGet, item, nil)
			if want := map[string]any{"image": "app:2"}; !reflect.DeepEqual(got["spec"], want) {
				t.Fatalf("spec after patch = %v, want %v", got["spec"], want)
			}
			if want := map[string]any{"tier": "dev", "owner": "neo"}; !reflect.DeepEqual(got["labels"], want) {
				t.Fatalf("labels after patch = %v, want %v", got["labels"], want)
			}

			if rec, _ = do(t, h, http.MethodPost, base+"?namespace=team-a", map[string]any{
				"metadata": map[string]any{"name": "demo"},
			}); rec.Code != http.StatusConflict {
				t.Fatalf("duplicate create: %d, want 409", rec.Code)
			}

			if rec, _ = do(t, h, http.MethodDelete, item, nil); rec.Code != http.StatusOK {
				t.Fatalf("delete: %d %s", rec.Code, rec.Body)
			}
			if rec, got = do(t, h, http.MethodGet, item, nil); rec.Code != http.StatusNotFound || got["reason"] != "NotFound" {
				t.Fatalf("get after delete: %d %v", rec.Code, got["reason"])
			}
			if rec, _ = do(t, h, http.MethodDelete, item, nil); rec.Code != http.StatusNotFound {
				t.Fatalf("second delete: %d, want 404", rec.Code)
			}
		})
	}
}

func TestUnknownKindIs400(t *testing.T) {
	h := newMux(newFakeClient(t), "")
	for _, req := range []struct{ method, path string }{
		{http.MethodGet, "/api/v1/widgets"},
		{http.MethodPost, "/api/v1/widgets"},
		{http.MethodGet, "/api/v1/widgets/ns/a"},
		{http.MethodPatch, "/api/v1/widgets/ns/a"},
		{http.MethodDelete, "/api/v1/widgets/ns/a"},
		{http.MethodGet, "/api/v1/widgets/ns/a/events"},
	} {
		rec, got := do(t, h, req.method, req.path, map[string]any{})
		if rec.Code != http.StatusBadRequest || got["message"] != "unknown kind: widgets" {
			t.Errorf("%s %s: %d %v", req.method, req.path, rec.Code, got["message"])
		}
	}
}

func TestKindWithoutCRDIsNotInstalled(t *testing.T) {
	h := newMux(newFakeClient(t), "")
	for _, path := range []string{"/api/v1/supplychains", "/api/v1/githubwebhooks/ns/a"} {
		rec, got := do(t, h, http.MethodGet, path, nil)
		if rec.Code != http.StatusNotFound || got["reason"] != "NotInstalled" {
			t.Errorf("GET %s: %d %v %v", path, rec.Code, got["reason"], got["message"])
		}
	}
}

func TestNoClusterIs503(t *testing.T) {
	h := newMux(nil, "")
	rec, _ := do(t, h, http.MethodGet, "/api/v1/environments", nil)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("list without a cluster: %d, want 503", rec.Code)
	}
}

func TestInvalidSpecIs400(t *testing.T) {
	h := newMux(newFakeClient(t), "")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/v1/environments",
		bytes.NewBufferString(`{"metadata":{"name":"x"},"spec":`)))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("truncated body: %d, want 400", rec.Code)
	}
}

func TestEventsForOneResourceOldestFirst(t *testing.T) {
	at := func(m int) metav1.Time { return metav1.NewTime(time.Date(2026, 10, 20, 12, m, 0, 0, time.UTC)) }
	event := func(name, obj, kind string, last metav1.Time, count int32) *corev1.Event {
		return &corev1.Event{
			ObjectMeta:     metav1.ObjectMeta{Name: name, Namespace: "team-a"},
			InvolvedObject: corev1.ObjectReference{Name: obj, Kind: kind, Namespace: "team-a"},
			Type:           "Normal", Reason: name, Message: name,
			FirstTimestamp: last, LastTimestamp: last, Count: count,
		}
	}
	c := newFakeClient(t,
		event("second", "demo", "Environment", at(5), 2),
		event("first", "demo", "Environment", at(1), 0),
		event("other-object", "other", "Environment", at(2), 1),
		event("other-kind", "demo", "Build", at(3), 1),
	)
	rec := httptest.NewRecorder()
	newMux(c, "").ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/environments/team-a/demo/events", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("events: %d %s", rec.Code, rec.Body)
	}
	var got []types.CREvent
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 || got[0].Reason != "first" || got[1].Reason != "second" {
		t.Fatalf("events = %+v, want first then second", got)
	}
	if got[0].Count != 1 || got[1].Count != 2 {
		t.Fatalf("counts = %d, %d; want 1 (zero means once), 2", got[0].Count, got[1].Count)
	}
	if got[1].LastTime != "2026-10-20T12:05:00Z" {
		t.Fatalf("lastTime = %q", got[1].LastTime)
	}
}

func TestEventTimeFallback(t *testing.T) {
	when := metav1.NewMicroTime(time.Date(2026, 10, 20, 9, 0, 0, 0, time.UTC))
	got := toEvents([]corev1.Event{{EventTime: when}, {}})
	if got[1].FirstTime != "2026-10-20T09:00:00Z" || got[1].LastTime != "2026-10-20T09:00:00Z" {
		t.Fatalf("event with only eventTime: %+v", got[1])
	}
	if got[0].FirstTime != "" || got[0].Count != 1 {
		t.Fatalf("event without times: %+v", got[0])
	}
}

func TestStatusConversion(t *testing.T) {
	u := &unstructured.Unstructured{Object: map[string]any{
		"metadata": map[string]any{"name": "b", "namespace": "dev", "generation": int64(3)},
		"spec":     map[string]any{"contract": map[string]any{"image": "x"}},
		"status": map[string]any{
			"conditions": []any{
				map[string]any{"type": "BuildStart", "status": "True", "reason": "Started",
					"message": "go", "lastTransitionTime": "2026-10-20T10:00:00Z", "observedGeneration": int64(3)},
				"not a condition",
			},
			"contract": map[string]any{"ExecutionRef": "run-1", "BuildHash": "abc", "Message": "", "Success": false},
		},
	}}
	got := toStatus(u, kinds["builds"])
	if got.Phase != types.PhaseRunning || got.Generation != 3 || got.Kind != "Build" {
		t.Fatalf("status = %+v", got)
	}
	if len(got.Conditions) != 1 || *got.Conditions[0].ObservedGeneration != 3 || got.Conditions[0].LastTransitionTime != "2026-10-20T10:00:00Z" {
		t.Fatalf("conditions = %+v", got.Conditions)
	}
	want := map[string]string{
		"build.blanketops.dev/executionRef": "run-1",
		"build.blanketops.dev/buildHash":    "abc",
		"build.blanketops.dev/success":      "false",
	}
	if !reflect.DeepEqual(got.Annotations, want) {
		t.Fatalf("annotations = %v, want %v", got.Annotations, want)
	}
	if string(got.Spec) != `{"image":"x"}` {
		t.Fatalf("spec = %s", got.Spec)
	}

	u.Object["status"].(map[string]any)["contract"].(map[string]any)["Success"] = true
	if got := toStatus(u, kinds["builds"]); got.Annotations["build.blanketops.dev/success"] != "true" {
		t.Fatalf("success annotation = %q", got.Annotations["build.blanketops.dev/success"])
	}

	bare := toStatus(&unstructured.Unstructured{Object: map[string]any{}}, kinds["routes"])
	if bare.Spec != nil || len(bare.Conditions) != 0 || bare.Phase != types.PhaseUnknown || bare.Annotations == nil {
		t.Fatalf("bare object status = %+v", bare)
	}
}

func TestGenericPhase(t *testing.T) {
	c := func(status, reason string) types.Condition { return types.Condition{Status: status, Reason: reason} }
	for name, tc := range map[string]struct {
		conds []types.Condition
		want  types.Phase
	}{
		"no conditions":           {nil, types.PhaseUnknown},
		"all true":                {[]types.Condition{c("True", "Resolved"), c("True", "Ready")}, types.PhaseReady},
		"one not yet true":        {[]types.Condition{c("True", "Resolved"), c("False", "Waiting")}, types.PhasePending},
		"unknown status":          {[]types.Condition{c("Unknown", "")}, types.PhasePending},
		"false with Failed":       {[]types.Condition{c("True", "Resolved"), c("False", "ApplyFailed")}, types.PhaseFailed},
		"false with Rejected":     {[]types.Condition{c("False", "Rejected")}, types.PhaseFailed},
		"false with Error":        {[]types.Condition{c("False", "ReconcileError")}, types.PhaseFailed},
		"true with Failed reason": {[]types.Condition{c("True", "PreviouslyFailed")}, types.PhaseReady},
	} {
		if got := genericPhase(tc.conds); got != tc.want {
			t.Errorf("%s: got %s, want %s", name, got, tc.want)
		}
	}
}

func TestKindSpecificPhases(t *testing.T) {
	cond := func(typ, status, reason string) types.Condition {
		return types.Condition{Type: typ, Status: status, Reason: reason}
	}
	builds := map[string]struct {
		conds []types.Condition
		want  types.Phase
	}{
		"none":      {nil, types.PhaseUnknown},
		"resolved":  {[]types.Condition{cond("BuildResolved", "True", "")}, types.PhasePending},
		"cached":    {[]types.Condition{cond("BuildCached", "True", "")}, types.PhasePending},
		"prereqs":   {[]types.Condition{cond("BuildPrerequisitesCreated", "True", "")}, types.PhasePending},
		"ready":     {[]types.Condition{cond("BuildReady", "True", "")}, types.PhasePending},
		"started":   {[]types.Condition{cond("BuildStart", "True", "")}, types.PhaseRunning},
		"succeeded": {[]types.Condition{cond("BuildStart", "True", ""), cond("BuildSuccess", "True", "")}, types.PhaseReady},
		"failed":    {[]types.Condition{cond("BuildSuccess", "True", ""), cond("BuildStart", "False", "BuildFailed")}, types.PhaseFailed},
	}
	for name, tc := range builds {
		if got := kinds["builds"].phaseOf(tc.conds); got != tc.want {
			t.Errorf("build %s: got %s, want %s", name, got, tc.want)
		}
	}
	events := map[string]struct {
		conds []types.Condition
		want  types.Phase
	}{
		"none":      {nil, types.PhaseUnknown},
		"resolved":  {[]types.Condition{cond("GitHubEventResolved", "True", "")}, types.PhasePending},
		"cached":    {[]types.Condition{cond("GitHubEventCached", "True", "")}, types.PhasePending},
		"prereqs":   {[]types.Condition{cond("GitHubEventPrerequisitesCreated", "True", "")}, types.PhasePending},
		"organized": {[]types.Condition{cond("GitHubEventOrganized", "True", "")}, types.PhaseRunning},
		"accepted":  {[]types.Condition{cond("GitHubEventAccepted", "True", "")}, types.PhaseReady},
		"rejected":  {[]types.Condition{cond("GitHubEventAccepted", "False", "GitHubEventRejected")}, types.PhaseFailed},
	}
	for name, tc := range events {
		if got := kinds["githubevents"].phaseOf(tc.conds); got != tc.want {
			t.Errorf("github event %s: got %s, want %s", name, got, tc.want)
		}
	}
}

func TestK8sErrorsMapToHTTPStatus(t *testing.T) {
	gr := schema.GroupResource{Group: "environments.blanketops.dev", Resource: "environments"}
	info := kinds["environments"]
	for _, tc := range []struct {
		err    error
		code   int
		reason string
	}{
		{&meta.NoKindMatchError{GroupKind: info.GVK.GroupKind()}, http.StatusNotFound, "NotInstalled"},
		{apierrors.NewNotFound(gr, "a"), http.StatusNotFound, "NotFound"},
		{apierrors.NewAlreadyExists(gr, "a"), http.StatusConflict, "AlreadyExists"},
		{apierrors.NewConflict(gr, "a", errors.New("stale")), http.StatusConflict, "Conflict"},
		{apierrors.NewInvalid(info.GVK.GroupKind(), "a", nil), http.StatusUnprocessableEntity, "Invalid"},
		{apierrors.NewBadRequest("bad"), http.StatusUnprocessableEntity, "Invalid"},
		{apierrors.NewForbidden(gr, "a", errors.New("rbac")), http.StatusForbidden, "Forbidden"},
		{apierrors.NewUnauthorized("who"), http.StatusUnauthorized, "Unauthorized"},
		{errors.New("boom"), http.StatusInternalServerError, "InternalServerError"},
	} {
		rec := httptest.NewRecorder()
		writeK8sErr(rec, tc.err, info)
		var got types.APIError
		_ = json.Unmarshal(rec.Body.Bytes(), &got)
		if rec.Code != tc.code || got.Reason != tc.reason || got.Code != tc.code {
			t.Errorf("%T %v: %d %s, want %d %s", tc.err, tc.err, rec.Code, got.Reason, tc.code, tc.reason)
		}
	}
}

func TestCreateDefaults(t *testing.T) {
	c := newFakeClient(t)
	h := newMux(c, "")

	// Namespace from the body when the query has none.
	rec, got := do(t, h, http.MethodPost, "/api/v1/routes", map[string]any{
		"metadata": map[string]any{"name": "r", "namespace": "team-b"},
	})
	if rec.Code != http.StatusCreated || got["namespace"] != "team-b" || got["spec"] != nil {
		t.Fatalf("create with body namespace: %d %v", rec.Code, got)
	}

	// No namespace anywhere: default. No name: generated from the kind.
	rec, got = do(t, h, http.MethodPost, "/api/v1/domains", map[string]any{"metadata": map[string]any{}})
	name, _ := got["name"].(string)
	if rec.Code != http.StatusCreated || got["namespace"] != "default" || !strings.HasPrefix(name, "domains-") {
		t.Fatalf("create without name or namespace: %d %v", rec.Code, got)
	}

	if rec, _ = do(t, h, http.MethodPost, "/api/v1/supplychains", map[string]any{"metadata": map[string]any{"name": "s"}}); rec.Code != http.StatusNotFound {
		t.Fatalf("create of a kind that is not installed: %d, want 404", rec.Code)
	}
}

func TestPatchErrors(t *testing.T) {
	h := newMux(newFakeClient(t), "")
	if rec, _ := do(t, h, http.MethodPatch, "/api/v1/packages/team-a/missing", map[string]any{}); rec.Code != http.StatusNotFound {
		t.Fatalf("patch of a missing object: %d, want 404", rec.Code)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPatch, "/api/v1/packages/team-a/x", bytes.NewBufferString("{")))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("patch with a truncated body: %d, want 400", rec.Code)
	}

	// Metadata only: the contract stays as it was.
	do(t, h, http.MethodPost, "/api/v1/packages?namespace=team-a", map[string]any{
		"metadata": map[string]any{"name": "p"}, "spec": map[string]any{"v": 1},
	})
	rec, got := do(t, h, http.MethodPatch, "/api/v1/packages/team-a/p", map[string]any{
		"metadata": map[string]any{"annotations": map[string]string{"note": "x"}},
	})
	if rec.Code != http.StatusOK || !reflect.DeepEqual(got["spec"], map[string]any{"v": float64(1)}) {
		t.Fatalf("metadata-only patch: %d spec=%v", rec.Code, got["spec"])
	}
	if ann, _ := got["annotations"].(map[string]any); ann["note"] != "x" {
		t.Fatalf("annotations after patch = %v", got["annotations"])
	}
}

func TestMergeMap(t *testing.T) {
	if got := mergeMap(nil, nil); got != nil {
		t.Fatalf("nil into nil = %v", got)
	}
	if got := mergeMap(nil, map[string]string{"a": "1"}); got["a"] != "1" {
		t.Fatalf("into nil = %v", got)
	}
	if got := mergeMap(map[string]string{"a": "1"}, map[string]string{"a": "2", "b": "3"}); !reflect.DeepEqual(got, map[string]string{"a": "2", "b": "3"}) {
		t.Fatalf("overwrite = %v", got)
	}
}

func TestDeleteAndEventsOfKindNotInstalled(t *testing.T) {
	h := newMux(newFakeClient(t), "")
	if rec, got := do(t, h, http.MethodDelete, "/api/v1/githubwebhooks/ns/a", nil); rec.Code != http.StatusNotFound || got["reason"] != "NotInstalled" {
		t.Fatalf("delete: %d %v", rec.Code, got["reason"])
	}
	if rec, got := do(t, h, http.MethodPatch, "/api/v1/githubwebhooks/ns/a", map[string]any{}); rec.Code != http.StatusNotFound || got["reason"] != "NotInstalled" {
		t.Fatalf("patch: %d %v", rec.Code, got["reason"])
	}
}
