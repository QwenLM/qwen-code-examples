#!/usr/bin/env python3
from skill_cli import main

if __name__ == "__main__":
    import sys
    sys.argv = [sys.argv[0], "preflight"] + sys.argv[1:]
    main()
