import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const changesetDir = join(root, ".changeset");
const changelogPath = join(root, "CHANGELOG.md");
const args = new Set(process.argv.slice(2));
const shouldWrite = args.has("--write");

if (!existsSync(changesetDir)) {
  process.exit(0);
}

const changesetFiles = readdirSync(changesetDir)
  .filter((file) => file.endsWith(".md") && file !== "README.md")
  .sort();

if (changesetFiles.length === 0) {
  process.exit(0);
}

const parseChangeset = (fileName) => {
  const content = readFileSync(join(changesetDir, fileName), "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return { packages: [], note: "" };
  }

  const frontmatter = match[1];
  const note = match[2].trim();
  const packages = [];

  for (const line of frontmatter.split("\n")) {
    const packageMatch = line.match(/^'([^']+)':\s*(patch|minor|major)\s*$/);
    if (packageMatch) {
      const packageName = packageMatch[1];
      if (!packageName.startsWith("@repo/")) {
        packages.push({ name: packageName, bump: packageMatch[2] });
      }
    }
  }

  return { packages, note };
};

const parsed = changesetFiles.map(parseChangeset);
const packageBumps = parsed.flatMap((entry) => entry.packages);

if (packageBumps.length === 0) {
  process.exit(0);
}

const seen = new Set();
const uniquePackageBumps = [];
for (const bump of packageBumps) {
  const key = `${bump.name}:${bump.bump}`;
  if (!seen.has(key)) {
    seen.add(key);
    uniquePackageBumps.push(bump);
  }
}

const notes = parsed
  .map((entry) => entry.note)
  .filter(Boolean)
  .map((note) => note.replace(/\s+/g, " "));

const marker = `<!-- changesets: ${changesetFiles.join(",")} -->`;
const date = new Date().toISOString().slice(0, 10);

const section = [
  marker,
  `## ${date}`,
  "",
  "### Highlights",
  ...(notes.length > 0 ? notes.map((note) => `- ${note}`) : ["- No additional notes."]),
  "",
  "### Package Releases",
  ...uniquePackageBumps.map((entry) => `- ${entry.name}: ${entry.bump}`),
  "",
  "### Full Changelog",
  "Package | Release type",
  "--- | ---",
  ...uniquePackageBumps.map((entry) => `${entry.name} | ${entry.bump}`),
  "",
].join("\n");

const header = "# Changelog\n\nCombined release notes for the monorepo. Internal @repo packages are excluded from this log.\n\n";

const template = `<!--\nDOTENV-DIFF RELEASE NOTES TEMPLATE\nGenerated from pending changesets. Internal @repo packages are excluded.\n-->\n\n${section}\n<!-- END TEMPLATE -->\n`;

if (!shouldWrite) {
  console.log(template);
  process.exit(0);
}

if (!existsSync(changelogPath)) {
  writeFileSync(changelogPath, `${header}${section}`, "utf8");
  process.exit(0);
}

const existing = readFileSync(changelogPath, "utf8");
if (existing.includes(marker)) {
  process.exit(0);
}

if (existing.startsWith("# Changelog")) {
  const updated = existing.replace(/^# Changelog\n\n/, `# Changelog\n\n${section}`);
  writeFileSync(changelogPath, updated, "utf8");
} else {
  writeFileSync(changelogPath, `${header}${section}${existing}`, "utf8");
}
