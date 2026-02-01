#!/bin/bash

# Script to create git worktrees for the leaf project
# Worktrees are created in a sibling leaf-worktrees directory
# Safe to source - will not exit your shell on error

_create_worktree() {
    local ROOT_WORKTREE_PATH WORKTREES_DIR WORKTREES_CONFIG
    local worktree_name suffix dir_name worktree_path branch_name cmd expanded_cmd

    # Get the git repo root (works regardless of how script is invoked)
    ROOT_WORKTREE_PATH="$(git rev-parse --show-toplevel)" || { echo "Error: Not in a git repository"; return 1; }
    WORKTREES_DIR="$ROOT_WORKTREE_PATH/../leaf-worktrees"
    WORKTREES_CONFIG="$ROOT_WORKTREE_PATH/.cursor/worktrees.json"

    # Function to convert string to kebab-case
    _to_kebab_case() {
        echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//'
    }

    # Function to generate random 3-letter string
    _generate_random_name() {
        cat /dev/urandom | LC_ALL=C tr -dc 'a-z' | head -c 3
    }

    # Ask user for optional name
    echo "Enter a name for the worktree (press Enter to generate a random 3-letter name):"
    read -r worktree_name

    # Determine the directory name
    if [ -z "$worktree_name" ]; then
        suffix=$(_generate_random_name)
    else
        suffix=$(_to_kebab_case "$worktree_name")
    fi

    dir_name="leaf-${suffix}"
    worktree_path="$WORKTREES_DIR/$dir_name"

    # Check if directory already exists
    if [ -e "$worktree_path" ]; then
        echo "Error: A directory with the name '$dir_name' already exists at $worktree_path"
        return 1
    fi

    # Create leaf-worktrees directory if it doesn't exist
    if [ ! -d "$WORKTREES_DIR" ]; then
        echo "Creating worktrees directory at: $WORKTREES_DIR"
        mkdir -p "$WORKTREES_DIR" || { echo "Error: Failed to create worktrees directory"; return 1; }
    fi

    echo "Creating worktree at: $worktree_path"

    # Create a new branch for the worktree (based on current branch)
    branch_name="worktree/${suffix}"

    # Create the git worktree with a new branch
    if ! git worktree add -b "$branch_name" "$worktree_path"; then
        echo "Error: Failed to create git worktree"
        return 1
    fi

    echo "Worktree created successfully!"
    echo "Branch: $branch_name"
    echo "Path: $worktree_path"

    # Run setup commands from worktrees.json
    if [ -f "$WORKTREES_CONFIG" ]; then
        echo ""
        echo "Running setup commands..."

        # Export ROOT_WORKTREE_PATH for use in commands
        export ROOT_WORKTREE_PATH

        # Change to the new worktree directory
        cd "$worktree_path" || { echo "Error: Failed to cd to worktree"; return 1; }

        # Parse and execute each command from the setup-worktree array
        # Using python for reliable JSON parsing
        python3 -c "
import json
import sys

with open('$WORKTREES_CONFIG', 'r') as f:
    config = json.load(f)

commands = config.get('setup-worktree', [])
for cmd in commands:
    print(cmd)
" | while read -r cmd; do
            # Expand environment variables in the command
            expanded_cmd=$(eval echo "$cmd")
            echo "Running: $expanded_cmd"
            eval "$expanded_cmd"
        done

        echo ""
        echo "Setup complete!"
    else
        echo "Warning: worktrees.json not found at $WORKTREES_CONFIG"
    fi

    echo ""
    echo "Worktree ready at: $worktree_path"

    # Change to the worktree directory
    cd "$worktree_path" || { echo "Error: Failed to cd to worktree"; return 1; }
}

# Run the function
_create_worktree
