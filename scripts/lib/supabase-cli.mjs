// Flags that make `supabase db push` / `supabase migration repair` act on the
// LINKED (remote) project, whatever CLI version the member has installed.
//
//   - CLI v1/v2: those commands target the linked project by default, and the
//     `--remote` flag doesn't exist (passing it fails).
//   - CLI v3: they target the LOCAL database by default. The linked project
//     needs `--remote`, and a hosted change run without a TTY needs `--yes`
//     (or SUPABASE_YES) instead of waiting on a prompt nobody answers.
//
// Pure functions, no I/O: setup.mjs runs the CLI and passes the output here.

/** Major version from `supabase --version` ("3.0.0", "2.20.5\n", "v1.226.4"); null if unreadable. */
export function parseCliMajor(versionOutput) {
  const m = /(\d+)\.\d+\.\d+/.exec(String(versionOutput ?? ""));
  return m ? Number(m[1]) : null;
}

/**
 * Extra flags for a command that must hit the linked project.
 * `helpText` (the command's --help) is only consulted when the version can't be read.
 */
export function remoteTargetFlags(major, helpText = "") {
  const v3 =
    major === null ? /--remote\b/.test(String(helpText ?? "")) : major >= 3;
  return v3 ? ["--remote", "--yes"] : [];
}

/** The full command line, e.g. `supabase db push --remote --yes`. */
export function supabaseRemoteCommand(base, flags) {
  return [base, ...flags].join(" ");
}
