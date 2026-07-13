import { describe, expect, it } from "vitest";
import {
  APPROVAL_STATUS_TRANSITIONS,
  CONTENT_WORKFLOW_TRANSITIONS,
  PUBLICATION_STATUS_TRANSITIONS,
  REVIEW_STATUS_TRANSITIONS,
  canTransitionApprovalStatus,
  canTransitionContentWorkflow,
  canTransitionPublicationStatus,
  canTransitionReviewStatus,
  getAllowedContentWorkflowTransitions,
  type AdministratorCapability,
  type AutomationCapability,
} from "./content-platform";

type Includes<Union, Member> = Member extends Union ? true : false;
type Assert<T extends true> = T;
type AssertFalse<T extends false> = T;

// Compile-time capability assertions. `tsc --noEmit` fails if a boundary changes.
type AutomationCanCreateSource = Assert<Includes<AutomationCapability, "source:create">>;
type AutomationCanCreateDraft = Assert<Includes<AutomationCapability, "draft:create">>;
type AutomationCanCreateAiRevision = Assert<Includes<AutomationCapability, "revision:ai:create">>;
type AutomationCannotApprove = AssertFalse<Includes<AutomationCapability, "approval:final:decide">>;
type AutomationCannotPublish = AssertFalse<Includes<AutomationCapability, "publication:create">>;
type AdministratorCanApprove = Assert<Includes<AdministratorCapability, "approval:final:decide">>;
type AdministratorCanPublish = Assert<Includes<AdministratorCapability, "publication:create">>;

const capabilityTypeAssertions: [
  AutomationCanCreateSource,
  AutomationCanCreateDraft,
  AutomationCanCreateAiRevision,
  AutomationCannotApprove,
  AutomationCannotPublish,
  AdministratorCanApprove,
  AdministratorCanPublish,
] = [true, true, true, false, false, true, true];

describe("content workflow transitions", () => {
  it.each([
    ["drafting", "first_review_pending", true],
    ["drafting", "final_approved", false],
    ["drafting", "published", false],
    ["first_review_pending", "first_review_approved", true],
    ["first_review_pending", "changes_requested", true],
    ["first_review_approved", "final_approval_pending", true],
    ["final_approval_pending", "final_approved", true],
    ["final_approved", "scheduled", true],
    // The current transition map intentionally permits immediate publication.
    ["final_approved", "published", true],
    ["scheduled", "published", true],
    ["published", "drafting", true],
    ["final_approved", "drafting", true],
    ["changes_requested", "drafting", true],
  ] as const)("checks %s -> %s", (from, to, expected) => {
    expect(canTransitionContentWorkflow(from, to)).toBe(expected);
  });
});

describe("review transitions", () => {
  it.each([
    ["pending", "approved", true],
    ["pending", "changes_requested", true],
    ["pending", "rejected", true],
    ["approved", "pending", false],
    ["changes_requested", "approved", false],
    ["rejected", "pending", false],
  ] as const)("checks %s -> %s", (from, to, expected) => {
    expect(canTransitionReviewStatus(from, to)).toBe(expected);
  });
});

describe("approval transitions", () => {
  it.each([
    ["pending", "approved", true],
    ["pending", "rejected", true],
    ["approved", "revoked", true],
    ["approved", "pending", false],
    ["revoked", "approved", false],
  ] as const)("checks %s -> %s", (from, to, expected) => {
    expect(canTransitionApprovalStatus(from, to)).toBe(expected);
  });
});

describe("publication transitions", () => {
  it.each([
    ["scheduled", "publishing", true],
    ["scheduled", "cancelled", true],
    ["publishing", "published", true],
    ["publishing", "failed", true],
    ["failed", "scheduled", true],
    ["failed", "publishing", true],
    ["published", "unpublished", true],
    ["cancelled", "published", false],
  ] as const)("checks %s -> %s", (from, to, expected) => {
    expect(canTransitionPublicationStatus(from, to)).toBe(expected);
  });
});

describe("allowed transition lookup", () => {
  it("returns the exact transition-map entry for every workflow status", () => {
    for (const status of Object.keys(CONTENT_WORKFLOW_TRANSITIONS) as Array<
      keyof typeof CONTENT_WORKFLOW_TRANSITIONS
    >) {
      expect(getAllowedContentWorkflowTransitions(status)).toEqual(CONTENT_WORKFLOW_TRANSITIONS[status]);
    }
  });
});

describe("capability boundaries", () => {
  it("keeps automation below final approval and publication", () => {
    // AI Agent and n8n share AutomationCapability, so both receive this boundary.
    expect(capabilityTypeAssertions).toEqual([true, true, true, false, false, true, true]);
  });
});

describe("transition maps are exhaustive for their status unions", () => {
  it("keeps every status map available at runtime", () => {
    expect(Object.keys(REVIEW_STATUS_TRANSITIONS)).toEqual([
      "pending",
      "approved",
      "changes_requested",
      "rejected",
    ]);
    expect(Object.keys(APPROVAL_STATUS_TRANSITIONS)).toEqual(["pending", "approved", "rejected", "revoked"]);
    expect(Object.keys(PUBLICATION_STATUS_TRANSITIONS)).toEqual([
      "scheduled",
      "publishing",
      "published",
      "failed",
      "cancelled",
      "unpublished",
    ]);
  });
});
