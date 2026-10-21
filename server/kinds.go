package main

import (
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/blanketops/environments-server/internal/types"
)

// kindInfo describes one custom resource kind the API serves. Every
// Environments CRD has the same shape (namespaced, spec.contract,
// status.conditions + status.contract), so one generic code path serves them
// all; only the phase rule and the Build annotations differ per kind.
type kindInfo struct {
	GVK schema.GroupVersionKind
	// phase turns the resource's conditions into the UI's phase. Nil means
	// genericPhase.
	phase func([]types.Condition) types.Phase
	// annotate copies fields of status.contract into annotations the UI
	// reads. Nil means none.
	annotate func(contract map[string]any, annotations map[string]string)
}

func gvk(group, kind string) schema.GroupVersionKind {
	return schema.GroupVersionKind{Group: group, Version: "v1alpha1", Kind: kind}
}

// kinds maps the API path segment (the CRD plural) to its kind. SupplyChain
// and GitHubWebhook come from the secure-software-supply-chain operator, not
// environments-install; when their CRDs are absent the API answers 404
// NotInstalled instead of an error.
var kinds = map[string]kindInfo{
	"environments":    {GVK: gvk("environments.blanketops.dev", "Environment")},
	"builds":          {GVK: gvk("environments.blanketops.dev", "Build"), phase: inferBuildPhase, annotate: buildAnnotations},
	"packages":        {GVK: gvk("environments.blanketops.dev", "Package")},
	"serviceunits":    {GVK: gvk("environments.blanketops.dev", "ServiceUnit")},
	"deployments":     {GVK: gvk("environments.blanketops.dev", "Deployment")},
	"routes":          {GVK: gvk("networks.blanketops.dev", "Route")},
	"domains":         {GVK: gvk("networks.blanketops.dev", "Domain")},
	"gitrepositories": {GVK: gvk("sources.blanketops.dev", "GitRepository")},
	"githubevents":    {GVK: gvk("events.blanketops.dev", "GitHubEvent"), phase: inferGitHubEventPhase},
	"supplychains":    {GVK: gvk("supplychain.blanketops.dev", "SupplyChain")},
	"githubwebhooks":  {GVK: gvk("supplychain.blanketops.dev", "GitHubWebhook")},
}

func (k kindInfo) phaseOf(conds []types.Condition) types.Phase {
	if k.phase != nil {
		return k.phase(conds)
	}
	return genericPhase(conds)
}

// genericPhase is the phase rule for kinds without their own: Failed when a
// condition is False with a failure reason, Ready when every condition is
// True, Pending while some are not yet True, Unknown with no conditions.
func genericPhase(conds []types.Condition) types.Phase {
	if len(conds) == 0 {
		return types.PhaseUnknown
	}
	allTrue := true
	for _, c := range conds {
		if c.Status == "False" && isFailureReason(c.Reason) {
			return types.PhaseFailed
		}
		if c.Status != "True" {
			allTrue = false
		}
	}
	if allTrue {
		return types.PhaseReady
	}
	return types.PhasePending
}

func isFailureReason(reason string) bool {
	for _, suffix := range []string{"Failed", "Rejected", "Error"} {
		if len(reason) >= len(suffix) && reason[len(reason)-len(suffix):] == suffix {
			return true
		}
	}
	return false
}

// buildAnnotations exposes the Build's execution result, which the build
// table and detail panel read from annotations.
func buildAnnotations(cs map[string]any, annotations map[string]string) {
	for field, key := range map[string]string{
		"ExecutionRef": "build.blanketops.dev/executionRef",
		"BuildHash":    "build.blanketops.dev/buildHash",
		"Message":      "build.blanketops.dev/message",
	} {
		if v, ok := cs[field].(string); ok && v != "" {
			annotations[key] = v
		}
	}
	if success, ok := cs["Success"].(bool); ok {
		if success {
			annotations["build.blanketops.dev/success"] = "true"
		} else {
			annotations["build.blanketops.dev/success"] = "false"
		}
	}
}

func inferBuildPhase(conds []types.Condition) types.Phase {
	var resolved, cached, prereqs, ready, started, succeeded, failed bool
	for _, c := range conds {
		switch c.Type {
		case "BuildResolved":
			resolved = c.Status == "True"
		case "BuildCached":
			cached = c.Status == "True"
		case "BuildPrerequisitesCreated":
			prereqs = c.Status == "True"
		case "BuildReady":
			ready = c.Status == "True"
		case "BuildStart":
			started = c.Status == "True"
		case "BuildSuccess":
			succeeded = c.Status == "True"
		}
		if c.Status == "False" {
			switch c.Reason {
			case "BuildFailed", "ResolveFailed", "PrerequisitesFailed", "CacheFailed":
				failed = true
			}
		}
	}
	if failed {
		return types.PhaseFailed
	}
	if succeeded {
		return types.PhaseReady
	}
	if started {
		return types.PhaseRunning
	}
	if ready || prereqs || cached || resolved {
		return types.PhasePending
	}
	return types.PhaseUnknown
}

func inferGitHubEventPhase(conds []types.Condition) types.Phase {
	var resolved, cached, prereqs, organized, accepted bool
	var failed bool
	for _, c := range conds {
		switch c.Type {
		case "GitHubEventResolved":
			resolved = c.Status == "True"
		case "GitHubEventCached":
			cached = c.Status == "True"
		case "GitHubEventPrerequisitesCreated":
			prereqs = c.Status == "True"
		case "GitHubEventOrganized":
			organized = c.Status == "True"
		case "GitHubEventAccepted":
			accepted = c.Status == "True"
		}
		if c.Status == "False" {
			switch c.Reason {
			case "GitHubEventRejected", "MatchFailed", "TriggerFailed":
				failed = true
			}
		}
	}
	if failed {
		return types.PhaseFailed
	}
	if accepted {
		return types.PhaseReady
	}
	if organized {
		return types.PhaseRunning
	}
	if prereqs || cached || resolved {
		return types.PhasePending
	}
	return types.PhaseUnknown
}
