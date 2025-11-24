#!/bin/bash

# jules-manager.sh
# Helper script to integrate GitHub CLI (gh) with Jules CLI

set -e

function show_help {
    echo "Usage: $0 [command]"
    echo "Commands:"
    echo "  list-issues           List assigned GitHub issues"
    echo "  start <issue_number>  Start a Jules session for the given issue"
    echo "  list-sessions         List active Jules sessions"
    echo "  status                Show both issues and sessions"
    echo "  help                  Show this help message"
}

function list_issues {
    echo "Fetching assigned issues..."
    gh issue list --assignee @me --limit 10
}

function start_session {
    local issue_number=$1
    if [ -z "$issue_number" ]; then
        echo "Error: Issue number required."
        echo "Usage: $0 start <issue_number>"
        exit 1
    fi

    echo "Fetching details for issue #$issue_number..."
    local issue_title
    issue_title=$(gh issue view "$issue_number" --json title --jq .title)
    
    if [ -z "$issue_title" ]; then
        echo "Error: Could not fetch issue details."
        exit 1
    fi

    echo "Starting Jules session for: $issue_title"
    jules new "Issue #$issue_number: $issue_title"
}

function list_sessions {
    echo "Active Jules Sessions:"
    jules remote list --session
}

function show_status {
    echo "=== GitHub Issues ==="
    list_issues
    echo ""
    echo "=== Jules Sessions ==="
    list_sessions
}

# Main logic
COMMAND=$1
shift

case "$COMMAND" in
    list-issues)
        list_issues
        ;;
    start)
        start_session "$@"
        ;;
    list-sessions)
        list_sessions
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        if [ -z "$COMMAND" ]; then
            show_help
        else
            echo "Unknown command: $COMMAND"
            show_help
            exit 1
        fi
        ;;
esac
