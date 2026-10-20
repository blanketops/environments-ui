package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/clientcmd"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/config"

	"github.com/blanketops/environments-server/internal/types"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	// ── Scheme ─────────────────────────────────────────────────────────
	// Only core types: the custom resources are served as unstructured
	// objects (resources.go), so no typed API module is needed.
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)

	// ── K8s client ─────────────────────────────────────────────────────
	k8sClient, err := newK8sClient(scheme)
	if err != nil {
		slog.Warn("k8s client unavailable", "err", err)
	}

	// ── Router ─────────────────────────────────────────────────────────
	mux := newMux(k8sClient, uiDir())

	slog.Info("blanketops server", "addr", ":"+port, "k8s", k8sClient != nil)
	if err := http.ListenAndServe(":"+port, cors(mux)); err != nil {
		slog.Error("server error", "err", err)
		os.Exit(1)
	}
}

// newMux registers the API routes and, when dir is set, the built UI.
func newMux(k8sClient client.Client, dir string) *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", handleHealth(k8sClient))
	mux.HandleFunc("GET /api/v1/{kind}/{ns}/{name}/events", handleEvents(k8sClient))
	mux.HandleFunc("GET /api/v1/{kind}/{ns}/{name}/debug", handleDebug(k8sClient))
	mux.HandleFunc("GET /api/v1/{kind}/{ns}/{name}", handleGet(k8sClient))
	mux.HandleFunc("PATCH /api/v1/{kind}/{ns}/{name}", handlePatch(k8sClient))
	mux.HandleFunc("DELETE /api/v1/{kind}/{ns}/{name}", handleDelete(k8sClient))
	mux.HandleFunc("GET /api/v1/{kind}", handleList(k8sClient))
	mux.HandleFunc("POST /api/v1/{kind}", handleCreate(k8sClient))

	// ── UI ─────────────────────────────────────────────────────────────
	// The ko image bundles the built UI as kodata; serve it from the same
	// origin as the API so the image runs without the nginx proxy.
	if dir != "" {
		mux.Handle("GET /", uiHandler(dir))
		slog.Info("serving ui", "dir", dir)
	}
	return mux
}

func newK8sClient(scheme *runtime.Scheme) (client.Client, error) {
	cfg, err := config.GetConfig()
	if err != nil {
		cfg, err = clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
			clientcmd.NewDefaultClientConfigLoadingRules(),
			&clientcmd.ConfigOverrides{},
		).ClientConfig()
		if err != nil {
			return nil, fmt.Errorf("no kubeconfig: %w", err)
		}
	}
	return client.New(cfg, client.Options{Scheme: scheme})
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("encode", "err", err)
	}
}

func writeErr(w http.ResponseWriter, status int, msg, reason string) {
	writeJSON(w, status, types.APIError{Message: msg, Reason: reason, Code: status})
}

func decode[T any](r *http.Request) (T, error) {
	var v T
	if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
		return v, fmt.Errorf("invalid request body: %w", err)
	}
	return v, nil
}

// ── Health ────────────────────────────────────────────────────────────────

func handleHealth(k8s client.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if k8s == nil {
			writeJSON(w, 503, map[string]any{
				"status": "unavailable", "connected": false,
				"reason": "Kubernetes client not initialized",
			})
			return
		}
		var nsList corev1.NamespaceList
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		if err := k8s.List(ctx, &nsList, client.Limit(1)); err != nil {
			writeJSON(w, 503, map[string]any{
				"status": "unavailable", "connected": false,
				"reason": err.Error(),
			})
			return
		}
		writeJSON(w, 200, map[string]any{
			"status": "ok", "connected": true, "store": "kubernetes",
		})
	}
}

// ── Debug ─────────────────────────────────────────────────────────────────

func handleDebug(k8s client.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, types.DebugInfo{
			Name: r.PathValue("name"), Namespace: r.PathValue("ns"), Kind: r.PathValue("kind"),
			QueueDepth: 0,
		})
	}
}
