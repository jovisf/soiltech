#!/usr/bin/env bash
# =============================================================================
# orchestrate.sh — Multi-agent pipeline orchestrator for ralph loop
#
# Pipeline: [ENGINEER] → [REVIEWER] → [TESTER] → [VALIDATOR]
#
# Each agent runs in an isolated ralph loop session, consuming the output
# of the previous agent as its input context.
#
# Usage:
#   ./orchestrate.sh <task_id> <prd_file>
#   ./orchestrate.sh TASK-3 PRD.md
#
# Requirements:
#   - `gemini` CLI available in PATH (ralph loop)
#   - GEMINI.md present in project root
#   - Skills directory at ./skills/
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
TASK_ID="${1:-}"
PRD_FILE="${2:-PRD.md}"
AGENTS_DIR=".agents"
LOG_DIR=".agents/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Agent GEMINI.md overrides — one file per agent persona
ENGINEER_PERSONA="$AGENTS_DIR/personas/engineer.md"
REVIEWER_PERSONA="$AGENTS_DIR/personas/reviewer.md"
TESTER_PERSONA="$AGENTS_DIR/personas/tester.md"
VALIDATOR_PERSONA="$AGENTS_DIR/personas/validator.md"

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()      { echo -e "${BLUE}[orchestrator]${RESET} $*"; }
success()  { echo -e "${GREEN}[✓]${RESET} $*"; }
warn()     { echo -e "${YELLOW}[!]${RESET} $*"; }
error()    { echo -e "${RED}[✗]${RESET} $*" >&2; }
phase()    { echo -e "\n${BOLD}${CYAN}══════════════════════════════════════${RESET}"; \
             echo -e "${BOLD}${CYAN}  $*${RESET}"; \
             echo -e "${BOLD}${CYAN}══════════════════════════════════════${RESET}\n"; }

require_cmd() {
  command -v "$1" &>/dev/null || { error "Required command not found: $1"; exit 1; }
}

require_file() {
  [[ -f "$1" ]] || { error "Required file not found: $1"; exit 1; }
}

# ---------------------------------------------------------------------------
# Validate inputs
# ---------------------------------------------------------------------------
validate_inputs() {
  [[ -z "$TASK_ID" ]] && { error "Usage: $0 <task_id> [prd_file]"; exit 1; }
  require_cmd gemini
  require_file "$PRD_FILE"
  require_file "GEMINI.md"
}

# ---------------------------------------------------------------------------
# Setup workspace
# ---------------------------------------------------------------------------
setup_workspace() {
  mkdir -p "$AGENTS_DIR"/{personas,handoffs,logs}

  # Create persona files if they don't exist
  if [[ ! -f "$ENGINEER_PERSONA" ]]; then
    cat > "$ENGINEER_PERSONA" << 'EOF'
# Agent Persona: ENGINEER

You are a senior software engineer. Your ONLY job in this session is the [ENGINEER] phase.

## Your Mandate
Implement the feature described in the task spec you will receive.
Follow all constraints in GEMINI.md exactly.

## Output Contract
When done, produce a file at: .agents/handoffs/TASK_ID/engineer-output.md

That file must contain:
1. A summary of what was implemented (max 10 lines)
2. List of files created or modified (with paths)
3. Any decisions made that deviate from the spec (justify each)
4. Blockers encountered (if any)

Do NOT review, test, or validate. Implement only.
EOF
  fi

  if [[ ! -f "$REVIEWER_PERSONA" ]]; then
    cat > "$REVIEWER_PERSONA" << 'EOF'
# Agent Persona: REVIEWER

You are a senior code reviewer. Your ONLY job is the [REVIEWER] phase.

## Your Mandate
You will receive the engineer's output. Read the implementation critically.

Check for:
- SRP violations
- DRY violations
- Missing error handling
- Poorly named identifiers
- Unnecessary complexity
- Missing edge cases
- TypeScript `any` usage without justification

Rewrite anything that fails these checks directly in the codebase.

## Output Contract
Produce: .agents/handoffs/TASK_ID/reviewer-output.md

That file must contain:
1. Issues found (each with file path + line reference)
2. Changes made to resolve each issue
3. Issues that are acceptable with justification
4. Overall verdict: APPROVED | APPROVED_WITH_CHANGES | BLOCKED

If BLOCKED, stop and do not advance the pipeline.
EOF
  fi

  if [[ ! -f "$TESTER_PERSONA" ]]; then
    cat > "$TESTER_PERSONA" << 'EOF'
# Agent Persona: TESTER

You are a QA engineer focused on automated testing. Your ONLY job is the [TESTER] phase.

## Your Mandate
You will receive the reviewer's output. Write automated tests for the implementation.

Required coverage:
- Happy path for every public method
- Error path (what happens when inputs are invalid or dependencies fail)
- At least one edge case per public method
- For HTTP endpoints: status codes, response shape, auth enforcement

Run the tests. They must pass before you write your output.

## Output Contract
Produce: .agents/handoffs/TASK_ID/tester-output.md

That file must contain:
1. Test files created (with paths)
2. Coverage summary (which cases are covered)
3. Test run result (pass/fail count)
4. Verdict: TESTS_PASS | TESTS_FAIL

If TESTS_FAIL, include the failure output and stop the pipeline.
EOF
  fi

  if [[ ! -f "$VALIDATOR_PERSONA" ]]; then
    cat > "$VALIDATOR_PERSONA" << 'EOF'
# Agent Persona: VALIDATOR

You are a senior DevOps/QA engineer. Your ONLY job is the [VALIDATOR] phase.

## Your Mandate
You will receive the tester's output. Validate the feature end-to-end.

Steps:
1. Boot the application (or isolated module)
2. Execute the validation steps defined in the task's [VALIDATOR] section
3. Confirm the feature works exactly as specified

## Commit Protocol
Before marking VALIDATED ✓, you MUST:
1. Stage and commit changes in logical, scoped commits
2. Follow Conventional Commits format strictly
3. Run `git log --oneline -10` and include the output in your report
4. No commit = pipeline not complete

## Output Contract
Produce: .agents/handoffs/TASK_ID/validator-output.md

That file must contain:
1. Validation steps executed (with results)
2. Git log output (last 10 commits)
3. Final verdict: VALIDATED ✓ | BLOCKED — <reason>

VALIDATED ✓ means: feature works, tests pass, commits pushed.
EOF
  fi

  log "Workspace ready at $AGENTS_DIR/"
}

# ---------------------------------------------------------------------------
# Extract task spec from PRD
# ---------------------------------------------------------------------------
extract_task() {
  local task_id="$1"
  local output_file="$AGENTS_DIR/handoffs/$task_id/task-spec.md"

  mkdir -p "$AGENTS_DIR/handoffs/$task_id"

  # Extract the task block from PRD
  # Logic: Start printing at the task header, stop at the next task header.
  # We use a stateful awk script to avoid range-matching issues.
  awk "/^## $task_id:/{p=1;print;next} /^## TASK-[0-9]/{p=0} p" "$PRD_FILE" \
    > "$output_file" 2>/dev/null || true

  # Fallback: try without trailing colon in the match
  if [[ ! -s "$output_file" ]]; then
    awk "/^## $task_id[^-]/{p=1;print;next} /^## TASK-[0-9]/{p=0} p" "$PRD_FILE" \
      > "$output_file" 2>/dev/null || true
  fi

  if [[ ! -s "$output_file" ]]; then
    error "Could not extract $task_id from $PRD_FILE"
    error "Make sure the task header matches exactly: '## $task_id: Title'"
    exit 1
  fi

  success "Task spec extracted to $output_file"
  echo "$output_file"
}

# ---------------------------------------------------------------------------
# Build agent prompt
# ---------------------------------------------------------------------------
build_prompt() {
  local agent="$1"        # engineer | reviewer | tester | validator
  local task_id="$2"
  local handoff_dir="$AGENTS_DIR/handoffs/$task_id"
  local persona_file="$AGENTS_DIR/personas/${agent}.md"

  local prompt="$(cat "$persona_file")\n\n"
  prompt+="---\n\n"
  prompt+="## Project Constitution (GEMINI.md)\n\n"
  prompt+="$(cat GEMINI.md)\n\n"
  prompt+="---\n\n"
  prompt+="## Task Spec\n\n"
  prompt+="$(cat "$handoff_dir/task-spec.md")\n\n"

  # Append previous agent's output if it exists
  case "$agent" in
    reviewer)
      [[ -f "$handoff_dir/engineer-output.md" ]] && \
        prompt+="---\n\n## Engineer Output (your input)\n\n$(cat "$handoff_dir/engineer-output.md")\n\n"
      ;;
    tester)
      [[ -f "$handoff_dir/reviewer-output.md" ]] && \
        prompt+="---\n\n## Reviewer Output (your input)\n\n$(cat "$handoff_dir/reviewer-output.md")\n\n"
      ;;
    validator)
      [[ -f "$handoff_dir/tester-output.md" ]] && \
        prompt+="---\n\n## Tester Output (your input)\n\n$(cat "$handoff_dir/tester-output.md")\n\n"
      ;;
  esac

  echo -e "$prompt"
}

# ---------------------------------------------------------------------------
# Run a single agent phase
# ---------------------------------------------------------------------------
run_agent() {
  local agent="$1"
  local task_id="$2"
  local handoff_dir="$AGENTS_DIR/handoffs/$task_id"
  local log_file="$LOG_DIR/${task_id}_${agent}_${TIMESTAMP}.log"
  local output_file="$handoff_dir/${agent}-output.md"
  local prompt_file="$handoff_dir/${agent}-prompt.md"

  phase "[$( echo $agent | tr '[:lower:]' '[:upper:]')] Phase — $task_id"

  # Build and save prompt for auditability
  build_prompt "$agent" "$task_id" > "$prompt_file"
  log "Prompt saved to $prompt_file"

  # Check if output already exists (resume support)
  if [[ -f "$output_file" ]]; then
    warn "Output already exists: $output_file"
    read -rp "  Re-run this agent? [y/N] " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || { log "Skipping $agent phase."; return 0; }
  fi

  log "Starting ralph loop for [$( echo $agent | tr '[:lower:]' '[:upper:]')]..."
  log "Log: $log_file"
  echo ""

  # Run gemini CLI with the prompt via ralph loop
  # We use the /ralph:loop command to allow the extension to manage multi-turn iterations
  gemini \
    --model gemini-3-flash-preview \
    -y \
    --prompt "/ralph:loop \"$(cat "$prompt_file")\" --max-iterations 3 --completion-promise DONE" \
    2>&1 | tee "$log_file"

  echo ""

  # Check for output file (agent must have produced it)
  if [[ ! -f "$output_file" ]]; then
    warn "Agent did not produce $output_file"
    warn "Check the log at $log_file"
    read -rp "  Continue anyway? [y/N] " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || { error "Pipeline stopped at [$agent]."; exit 1; }
  else
    success "[$( echo $agent | tr '[:lower:]' '[:upper:]')] output: $output_file"
  fi

  # Check for BLOCKED status in output
  if [[ -f "$output_file" ]] && grep -qi "BLOCKED" "$output_file"; then
    error "Agent reported BLOCKED status:"
    grep -i "BLOCKED" "$output_file"
    echo ""
    read -rp "  Force continue? [y/N] " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || { error "Pipeline stopped at [$agent]."; exit 1; }
  fi

  log "Sleeping 30s to avoid rate limiting..."
  sleep 30
}

# ---------------------------------------------------------------------------
# Run full pipeline for a task
# ---------------------------------------------------------------------------
run_pipeline() {
  local task_id="$1"

  phase "Starting pipeline for $task_id"
  log "PRD: $PRD_FILE"
  log "Timestamp: $TIMESTAMP"

  extract_task "$task_id"

  run_agent "engineer"  "$task_id"
  run_agent "reviewer"  "$task_id"
  run_agent "tester"    "$task_id"
  run_agent "validator" "$task_id"

  phase "Pipeline Complete — $task_id"

  # Final summary
  local handoff_dir="$AGENTS_DIR/handoffs/$task_id"
  echo -e "${BOLD}Outputs:${RESET}"
  for agent in engineer reviewer tester validator; do
    local f="$handoff_dir/${agent}-output.md"
    if [[ -f "$f" ]]; then
      echo -e "  ${GREEN}✓${RESET} $f"
    else
      echo -e "  ${RED}✗${RESET} $f (missing)"
    fi
  done

  echo ""
  if [[ -f "$handoff_dir/validator-output.md" ]] && \
     grep -q "VALIDATED ✓" "$handoff_dir/validator-output.md"; then
    success "$task_id — VALIDATED ✓"
  else
    warn "$task_id — Validator output inconclusive. Review manually."
  fi
}

# ---------------------------------------------------------------------------
# Interactive mode — run all tasks in PRD sequentially
# ---------------------------------------------------------------------------
run_all() {
  log "Extracting all tasks from $PRD_FILE..."
  local tasks
  tasks=$(grep -oE "^## (TASK-[0-9]+):" "$PRD_FILE" | grep -oE "TASK-[0-9]+" | sort -t- -k2 -n)

  if [[ -z "$tasks" ]]; then
    error "No tasks found in $PRD_FILE"
    exit 1
  fi

  echo -e "${BOLD}Tasks found:${RESET}"
  echo "$tasks" | nl -ba
  echo ""

  read -rp "Run all tasks sequentially? [y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || { log "Aborted."; exit 0; }

  while IFS= read -r task; do
    run_pipeline "$task"
    echo ""
    read -rp "Advance to next task? [Y/n] " next
    [[ "$next" =~ ^[Nn]$ ]] && { log "Stopped after $task."; exit 0; }
  done <<< "$tasks"

  success "All tasks complete."
}

# ---------------------------------------------------------------------------
# Status command — show pipeline state for a task
# ---------------------------------------------------------------------------
show_status() {
  local task_id="$1"
  local handoff_dir="$AGENTS_DIR/handoffs/$task_id"

  echo -e "\n${BOLD}Pipeline status for $task_id:${RESET}\n"

  for agent in engineer reviewer tester validator; do
    local f="$handoff_dir/${agent}-output.md"
    if [[ -f "$f" ]]; then
      local verdict
      verdict=$(grep -oiE "(VALIDATED ✓|BLOCKED.*|APPROVED.*|TESTS_PASS|TESTS_FAIL)" "$f" | head -1 || echo "output present")
      echo -e "  ${GREEN}✓${RESET} $(printf '%-12s' "[$( echo $agent | tr '[:lower:]' '[:upper:]')]") — $verdict"
    else
      echo -e "  ${YELLOW}○${RESET} $(printf '%-12s' "[$( echo $agent | tr '[:lower:]' '[:upper:]')]") — pending"
    fi
  done
  echo ""
}

# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
validate_inputs
setup_workspace

# Route command
case "${TASK_ID}" in
  "all")
    run_all
    ;;
  "status")
    [[ -z "${2:-}" ]] && { error "Usage: $0 status <task_id>"; exit 1; }
    show_status "$2"
    ;;
  TASK-*)
    run_pipeline "$TASK_ID"
    ;;
  *)
    error "Unknown task ID: $TASK_ID"
    echo "Usage:"
    echo "  $0 TASK-3 PRD.md        # run pipeline for specific task"
    echo "  $0 all PRD.md           # run all tasks interactively"
    echo "  $0 status TASK-3        # show pipeline status"
    exit 1
    ;;
esac
