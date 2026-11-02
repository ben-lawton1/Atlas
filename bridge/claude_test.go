package main

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func fakeExt(t *testing.T, home, folder string, mtime time.Time) string {
	t.Helper()
	dir := filepath.Join(home, ".vscode", "extensions", folder, "resources", "native-binary")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	bin := filepath.Join(dir, "claude.exe")
	if err := os.WriteFile(bin, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Chtimes(bin, mtime, mtime); err != nil {
		t.Fatal(err)
	}
	return bin
}

func TestNewestVSCodeClaudeVersionOrdering(t *testing.T) {
	home := t.TempDir()
	now := time.Now()
	fakeExt(t, home, "anthropic.claude-code-2.1.9-win32-x64", now)
	want := fakeExt(t, home, "anthropic.claude-code-2.10.2-win32-x64", now.Add(-48*time.Hour)) // older mtime, higher version
	fakeExt(t, home, "anthropic.claude-code-2.2.0-win32-x64", now)
	fakeExt(t, home, "someone.else-9.9.9", now)
	if got := newestVSCodeClaude(home); got != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}

func TestNewestVSCodeClaudeMtimeFallback(t *testing.T) {
	home := t.TempDir()
	now := time.Now()
	fakeExt(t, home, "anthropic.claude-code-weird-a", now.Add(-time.Hour))
	want := fakeExt(t, home, "anthropic.claude-code-weird-b", now)
	if got := newestVSCodeClaude(home); got != want {
		t.Fatalf("got %s, want %s", got, want)
	}
	// a parsable version beats unparsable ones whatever the mtime
	v := fakeExt(t, home, "anthropic.claude-code-1.0.0", now.Add(-72*time.Hour))
	if got := newestVSCodeClaude(home); got != v {
		t.Fatalf("got %s, want %s", got, v)
	}
}

func TestNewestVSCodeClaudeMissing(t *testing.T) {
	home := t.TempDir()
	if got := newestVSCodeClaude(home); got != "" {
		t.Fatalf("no extensions dir: got %q", got)
	}
	// folder without the binary is ignored
	if err := os.MkdirAll(filepath.Join(home, ".vscode", "extensions", "anthropic.claude-code-3.0.0"), 0o755); err != nil {
		t.Fatal(err)
	}
	if got := newestVSCodeClaude(home); got != "" {
		t.Fatalf("no binary: got %q", got)
	}
	if got := newestVSCodeClaude(""); got != "" {
		t.Fatalf("empty home: got %q", got)
	}
}

func TestClaudeProfile(t *testing.T) {
	home := t.TempDir()
	ext := fakeExt(t, home, "anthropic.claude-code-2.0.0-win32-x64", time.Now())
	env := func(k string) string {
		if k == "USERPROFILE" {
			return home
		}
		return ""
	}
	// PATH wins
	p, ok := claudeProfile("windows", look("claude"), env)
	if !ok || p.ID != "claude" || p.Name != "Claude Code" || p.Command != "claude" || p.Cwd != "~/aios" {
		t.Fatalf("path: %+v %v", p, ok)
	}
	// extension fallback on Windows
	p, ok = claudeProfile("windows", look(), env)
	if !ok || p.Command != ext {
		t.Fatalf("extension: %+v %v", p, ok)
	}
	// nothing found: not listed
	if _, ok = claudeProfile("windows", look(), func(string) string { return t.TempDir() }); ok {
		t.Fatal("listed without a binary")
	}
	// Linux resolves PATH only, never the extension folder
	if _, ok = claudeProfile("linux", look(), env); ok {
		t.Fatal("linux used the extension folder")
	}
	// and it flows into the built-in profile list
	if ps := builtinProfilesFor("windows", look("claude"), env); ps[len(ps)-1].ID != "claude" {
		t.Fatalf("not appended: %+v", ps)
	}
	if ps := builtinProfilesFor("windows", look(), func(string) string { return "" }); len(ps) != 1 {
		t.Fatalf("listed without binary: %+v", ps)
	}
}
