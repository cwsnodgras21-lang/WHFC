# NolTurn AI Workflow

Use this workflow for every NolTurn coding task.

## Step 1: Architect

Create a short plan before coding.

Include:
- goal
- assumptions
- affected files
- database changes
- API changes
- risks
- implementation steps

Do not write code yet.

## Step 2: Builder

Implement only the approved plan.

Rules:
- smallest possible change
- no unrelated refactors
- no surprise redesigns
- no new dependencies unless justified

## Step 3: Reviewer

Review the implementation critically.

Look for:
- broken logic
- security issues
- missing validation
- poor Supabase patterns
- type errors
- edge cases
- unnecessary complexity

## Step 4: Tester

Provide:
- tests run
- manual test steps
- expected results
- untested risks

## Step 5: Handoff

Summarize:
- what changed
- files changed
- database changes
- deployment notes
- rollback steps
