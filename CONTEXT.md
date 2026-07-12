# Cortex

This context defines the language for converting cited company knowledge into reviewed, executable skills for AI agents.

## Language

**Workspace**:
The tenant boundary containing Sources, Skills, runs, conflicts, tokens, and members for one company or operating group.
_Avoid_: Clerk organization alone, source collection

**Source**:
An ingested document or connected-system record from which operational knowledge may be extracted.
_Avoid_: Skill, uncited model knowledge

**Source Chunk**:
A stable, addressable portion of a Source with offsets used for extraction and citation verification.
_Avoid_: Arbitrary prompt excerpt

**Citation**:
A Source Chunk reference plus a verbatim quote that must be verified as an actual substring before the associated claim is trusted.
_Avoid_: URL without evidence, model-generated quotation

**Skill**:
A structured operational procedure with triggers, ordered steps, decision rules, exceptions, guardrails, owners, confidence, and Citations.
_Avoid_: Chat answer, source summary, software capability

**Extraction Run**:
A durable, budget-governed workflow that proposes Skills from selected Source Chunks.
_Avoid_: Approved publication, synchronous page request

**Candidate Skill**:
An extracted Skill awaiting human review.
_Avoid_: Approved Skill, raw model output

**Conflict**:
Two supported operational claims that cannot both govern the same scenario without review.
_Avoid_: Duplicate wording, low confidence alone

**Approved Skill**:
A reviewed Skill version eligible for export and agent consumption.
_Avoid_: Candidate Skill, draft edit

**Compiled Brain**:
The deterministic Markdown, JSON, or YAML export assembled from current Approved Skills.
_Avoid_: Vector index, chatbot memory

**Agent Token**:
A revocable credential that allows an external agent to retrieve or execute the Compiled Brain for one Workspace.
_Avoid_: Human session, provider API key

**Scenario Execution**:
A test or API call that applies Approved Skills to a concrete situation and reports the cited procedure used.
_Avoid_: Autonomous permission to mutate source systems
