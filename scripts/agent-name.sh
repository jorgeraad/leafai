#!/usr/bin/env bash
# Generates a unique agent name: adjective-animal
# Used by coding agents to identify themselves across concurrent sessions.

ADJECTIVES=(swift calm bold keen warm bright sharp steady quick gentle
  brave clear cool deep fast fresh grand light mild neat prime pure
  safe slim true vast wise)

ANIMALS=(falcon otter lynx crane heron panda raven cedar maple aspen
  badger bobcat cobra coyote eagle finch gecko hawk iguana jackal
  kestrel lemur marten newt osprey)

echo "${ADJECTIVES[$((RANDOM % ${#ADJECTIVES[@]}))]}-${ANIMALS[$((RANDOM % ${#ANIMALS[@]}))]}"
