#!/bin/bash

# Script to create git worktrees for the leaf project
# Worktrees are created in a sibling leaf-worktrees directory
# Safe to source - will not exit your shell on error

_create_worktree() {
    local ROOT_WORKTREE_PATH WORKTREES_DIR
    local worktree_name suffix dir_name worktree_path branch_name

    # Get the git repo root (works regardless of how script is invoked)
    ROOT_WORKTREE_PATH="$(git rev-parse --show-toplevel)" || { echo "Error: Not in a git repository"; return 1; }
    WORKTREES_DIR="$ROOT_WORKTREE_PATH/../leaf-worktrees"

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

    # Copy environment files to the new worktree
    for env_file in .env .env.local; do
        if [ -f "$ROOT_WORKTREE_PATH/$env_file" ]; then
            cp "$ROOT_WORKTREE_PATH/$env_file" "$worktree_path/$env_file"
            echo "Copied $env_file to worktree"
        fi
    done

    echo ""
    echo "Worktree ready at: $worktree_path"

    # Change to the worktree directory
    cd "$worktree_path" || { echo "Error: Failed to cd to worktree"; return 1; }
}

# Run the function
_create_worktree
