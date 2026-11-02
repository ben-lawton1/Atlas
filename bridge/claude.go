package main

import (
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
)

// claudeProfile is the built-in "Claude Code" profile (D27). It is only returned
// when a claude binary can be found: first `claude` on PATH, then (Windows only)
// the newest copy bundled with the VS Code extension.
func claudeProfile(goos string, lookPath func(string) (string, error), getenv func(string) string) (Profile, bool) {
	bin := ""
	if p, err := lookPath("claude"); err == nil && p != "" {
		bin = p
	} else if goos == "windows" {
		bin = newestVSCodeClaude(getenv("USERPROFILE"))
	}
	if bin == "" {
		return Profile{}, false
	}
	return Profile{ID: "claude", Name: "Claude Code", Command: bin, Cwd: "~/aios"}, true
}

var extVersionRe = regexp.MustCompile(`^anthropic\.claude-code-(\d+)\.(\d+)\.(\d+)`)

type extCandidate struct {
	bin     string
	version [3]int
	parsed  bool
	mtime   int64
}

// newestVSCodeClaude returns the claude.exe of the newest anthropic.claude-code-*
// extension folder under home\.vscode\extensions, or "" if there is none. Newest
// means highest semantic version in the folder name; folders without a parsable
// version rank below parsable ones, and ties fall back to modification time.
func newestVSCodeClaude(home string) string {
	if home == "" {
		return ""
	}
	root := filepath.Join(home, ".vscode", "extensions")
	entries, err := os.ReadDir(root)
	if err != nil {
		return ""
	}
	var cands []extCandidate
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		name := e.Name()
		if len(name) < len("anthropic.claude-code-") || name[:len("anthropic.claude-code-")] != "anthropic.claude-code-" {
			continue
		}
		bin := filepath.Join(root, name, "resources", "native-binary", "claude.exe")
		st, err := os.Stat(bin)
		if err != nil || st.IsDir() {
			continue
		}
		c := extCandidate{bin: bin, mtime: st.ModTime().UnixNano()}
		if m := extVersionRe.FindStringSubmatch(name); m != nil {
			c.parsed = true
			for i := 0; i < 3; i++ {
				c.version[i], _ = strconv.Atoi(m[i+1])
			}
		}
		cands = append(cands, c)
	}
	if len(cands) == 0 {
		return ""
	}
	sort.Slice(cands, func(i, j int) bool {
		a, b := cands[i], cands[j]
		if a.parsed != b.parsed {
			return a.parsed
		}
		if a.parsed && a.version != b.version {
			for k := 0; k < 3; k++ {
				if a.version[k] != b.version[k] {
					return a.version[k] > b.version[k]
				}
			}
		}
		return a.mtime > b.mtime
	})
	return cands[0].bin
}
