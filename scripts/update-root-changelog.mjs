import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const changesetDir = join(root, '.changeset');
const changelogPath = join(root, 'CHANGELOG.md');
const args = new Set(process.argv.slice(2));
const shouldWrite = args.has('--write');

try {
	await access(changesetDir);
} catch {
	process.exit(0);
}

const changesetFiles = (await readdir(changesetDir))
	.filter((file) => file.endsWith('.md') && file !== 'README.md')
	.sort();

if (changesetFiles.length === 0) {
	process.exit(0);
}

const parseChangeset = async (fileName) => {
	const content = (await readFile(join(changesetDir, fileName), 'utf8')).replace(/^\uFEFF/, '');
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

	if (!match) {
		return { packages: [], note: '' };
	}

	const frontmatter = match[1];
	const note = match[2].trim();
	const packages = [];

	for (const line of frontmatter.split(/\r?\n/)) {
		const packageMatch = line.match(/^["']([^"']+)["']:\s*(patch|minor|major)\s*$/);
		if (!packageMatch) {
			continue;
		}

		const packageName = packageMatch[1];
		if (packageName.startsWith('@repo/')) {
			continue;
		}

		packages.push({ name: packageName, bump: packageMatch[2] });
	}

	return { packages, note };
};

const parsed = await Promise.all(changesetFiles.map(parseChangeset));
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
	.map((note) => note.replace(/\s+/g, ' '));

const marker = `<!-- changesets: ${changesetFiles.join(',')} -->`;
const date = new Date().toISOString().slice(0, 10);

const section = [
	marker,
	`## ${date}`,
	'',
	'### Highlights',
	...(notes.length > 0 ? notes.map((note) => `- ${note}`) : ['- No additional notes.']),
	'',
	'### Package Releases',
	...uniquePackageBumps.map((entry) => `- ${entry.name}: ${entry.bump}`),
	'',
	'### Full Changelog',
	'Package | Release type',
	'--- | ---',
	...uniquePackageBumps.map((entry) => `${entry.name} | ${entry.bump}`),
	''
].join('\n');

const header =
	'# Changelog\n\nCombined release notes for the monorepo. Internal @repo packages are excluded from this log.\n\n';

const template = `<!--\nDOTENV-DIFF RELEASE NOTES TEMPLATE\nGenerated from pending changesets. Internal @repo packages are excluded.\n-->\n\n${section}\n<!-- END TEMPLATE -->\n`;

if (!shouldWrite) {
	console.log(template);
	process.exit(0);
}

let existing = '';
try {
	existing = await readFile(changelogPath, 'utf8');
} catch {
	await writeFile(changelogPath, `${header}${section}`, 'utf8');
	process.exit(0);
}

if (existing.includes(marker)) {
	process.exit(0);
}

if (existing.startsWith('# Changelog')) {
	const updated = existing.replace(/^# Changelog\r?\n\r?\n/, `# Changelog\n\n${section}\n`);
	await writeFile(changelogPath, updated, 'utf8');
} else {
	await writeFile(changelogPath, `${header}${section}${existing}`, 'utf8');
}
