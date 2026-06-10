package main

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/blanketops/environments-server/internal/store"
	"github.com/blanketops/environments-server/internal/types"
)

var db = store.NewSeeded()

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	// Sub-resource routes registered before the base resource catch-all
	// (Go 1.22 ServeMux: more-specific patterns win, but explicit is clearer).
	mux.HandleFunc("GET /api/v1/{kind}/{ns}/{name}/events", handleEvents)
	mux.HandleFunc("GET /api/v1/{kind}/{ns}/{name}/debug",  handleDebug)

	// Resource routes
	mux.HandleFunc("GET    /api/v1/{kind}/{ns}/{name}", handleGet)
	mux.HandleFunc("PATCH  /api/v1/{kind}/{ns}/{name}", handlePatch)
	mux.HandleFunc("DELETE /api/v1/{kind}/{ns}/{name}", handleDelete)

	// Collection routes
	mux.HandleFunc("GET  /api/v1/{kind}", handleList)
	mux.HandleFunc("POST /api/v1/{kind}", handleCreate)

	slog.Info("blanketops stub server", "addr", ":"+port)
	if err := http.ListenAndServe(":"+port, cors(mux)); err != nil {
		slog.Error("server error", "err", err)
		os.Exit(1)
	}
}

// ── Middleware ────────────────────────────────────────────────────────────

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

// ── JSON helpers ──────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("encode", "err", err)
	}
}

type storeErr interface {
	HTTPStatus() int
	HTTPReason() string
}

func writeErr(w http.ResponseWriter, err error) {
	if se, ok := err.(storeErr); ok {
		writeJSON(w, se.HTTPStatus(), types.APIError{Message: err.Error(), Reason: se.HTTPReason(), Code: se.HTTPStatus()})
		return
	}
	writeJSON(w, 500, types.APIError{Message: err.Error(), Reason: "InternalServerError", Code: 500})
}

func decode[T any](r *http.Request) (T, error) {
	var v T
	if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
		return v, fmt.Errorf("invalid request body: %w", err)
	}
	return v, nil
}

// ── Handlers ──────────────────────────────────────────────────────────────

func handleList(w http.ResponseWriter, r *http.Request) {
	kind := r.PathValue("kind")
	ns   := r.URL.Query().Get("namespace")
	items, err := db.List(kind, ns)
	if err != nil {
		writeErr(w, err)
		return
	}
	if items == nil {
		items = []types.CRStatus{}
	}
	writeJSON(w, 200, types.ListResponse{Items: items, ResourceVersion: "stub-rv", Total: len(items)})
}

func handleCreate(w http.ResponseWriter, r *http.Request) {
	kind := r.PathValue("kind")
	ns   := r.URL.Query().Get("namespace")
	if ns == "" {
		ns = "blanketops-system"
	}
	body, err := decode[types.CreateBody](r)
	if err != nil {
		writeJSON(w, 400, types.APIError{Message: err.Error(), Reason: "BadRequest", Code: 400})
		return
	}
	cr, err := db.Create(kind, ns, body)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 201, cr)
}

func handleGet(w http.ResponseWriter, r *http.Request) {
	cr, err := db.Get(r.PathValue("kind"), r.PathValue("ns"), r.PathValue("name"))
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, cr)
}

func handlePatch(w http.ResponseWriter, r *http.Request) {
	body, err := decode[types.PatchBody](r)
	if err != nil {
		writeJSON(w, 400, types.APIError{Message: err.Error(), Reason: "BadRequest", Code: 400})
		return
	}
	cr, err := db.Patch(r.PathValue("kind"), r.PathValue("ns"), r.PathValue("name"), body)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, cr)
}

func handleDelete(w http.ResponseWriter, r *http.Request) {
	resp, err := db.Delete(r.PathValue("kind"), r.PathValue("ns"), r.PathValue("name"))
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, resp)
}

func handleEvents(w http.ResponseWriter, r *http.Request) {
	cr, err := db.Get(r.PathValue("kind"), r.PathValue("ns"), r.PathValue("name"))
	if err != nil {
		writeErr(w, err)
		return
	}
	events := cr.Events
	if events == nil {
		events = []types.CREvent{}
	}
	writeJSON(w, 200, events)
}

func handleDebug(w http.ResponseWriter, r *http.Request) {
	cr, err := db.Get(r.PathValue("kind"), r.PathValue("ns"), r.PathValue("name"))
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, store.BuildDebugInfo(cr))
}
