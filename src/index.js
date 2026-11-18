'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const semver = require('./semver');

// https://docs.github.com/en/actions/reference/workflow-commands-for-github-actions
function escapeData(s) {
  return String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function issue(command, message) {
  process.stdout.write(`::${command}::${escapeData(message)}${os.EOL}`);
}

function getInput(name, { required = false } = {}) {
  const val = (process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '').trim();
  if (required && !val) {
    throw new Error(`Input required and not supplied: ${name}`);
  }
  return val;
}

// arch in [arm, x32, x64...] (https://nodejs.org/api/os.html#os_os_arch)
// return value in [amd64, 386, arm]
function mapArch(arch) {
  return arch === 'x64' ? 'amd64' : arch;
}

// os in [darwin, linux, win32...] (https://nodejs.org/api/os.html#os_os_platform)
// return value in [darwin, linux, windows]
function mapOS(platform) {
  return platform === 'win32' ? 'windows' : platform;
}

// append static to the filename if requesting the static binary
// opa_linux_arm64_static
function maybeStatic(arch, filename) {
  const staticBinary = getInput('static') === 'true' || arch === 'arm64'; // For arm64, we only have static binaries
  return staticBinary ? `${filename}_static` : filename;
}

function getDownloadObject(version, mirror) {
  let vsn = `v${version}`;
  let github = true;
  if (version === 'latest' || version === 'edge') {
    if (mirror !== 'https://github.com') {
      issue('warning', 'Latest or edge versions not supported when mirror is set');
    }
    vsn = version;
    github = false;
  }

  const platform = os.platform();
  const arch = mapArch(os.arch());

  // opa_darwin_amd64
  const filename = `opa_${mapOS(platform)}_${arch}`;
  const binaryName = platform === 'win32' ? `${filename}.exe` : maybeStatic(arch, filename);

  const url = github
    ? `${mirror}/open-policy-agent/opa/releases/download/${vsn}/${binaryName}`
    : `https://www.openpolicyagent.org/downloads/${vsn}/${binaryName}`;

  return { url, binaryName };
}

// Retries network errors and 5xx/429 responses; other statuses (e.g. 404) are final.
async function withRetries(what, fn, attempts = 3) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e.permanent || i >= attempts) {
        throw e;
      }
      const wait = 1000 + Math.random() * 2000;
      issue('warning', `${what} failed (attempt ${i}/${attempts}): ${e.message}. Retrying in ${Math.round(wait / 1000)}s.`);
      await new Promise((resolve) => { setTimeout(resolve, wait); });
    }
  }
}

function httpError(what, res) {
  const e = new Error(`${what}: ${res.status} ${res.statusText}`);
  e.permanent = res.status < 500 && res.status !== 429;
  return e;
}

async function download(url, dest) {
  await withRetries(`Download of ${url}`, async () => {
    const res = await fetch(url);
    if (!res.ok) {
      throw httpError(`Failed to download ${url}`, res);
    }
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest, { mode: 0o755 }));
  });
}

async function getAllVersions() {
  const token = getInput('github-token', { required: true });
  const versions = [];
  for (let page = 1; ; page++) {
    const releases = await withRetries('Listing OPA releases', async () => {
      const res = await fetch(`https://api.github.com/repos/open-policy-agent/opa/releases?per_page=100&page=${page}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      if (!res.ok) {
        throw httpError('Failed to list OPA releases', res);
      }
      return res.json();
    });
    for (const release of releases) {
      if (release.name) {
        versions.push(release.name);
      }
    }
    if (releases.length < 100) {
      return versions;
    }
  }
}

async function getVersion() {
  const version = getInput('version');
  if (version === 'latest' || version === 'edge') {
    return version;
  }

  const cleaned = semver.clean(version);
  if (cleaned) {
    return cleaned;
  }

  if (semver.validRange(version)) {
    const max = semver.maxSatisfying(await getAllVersions(), version);
    if (max) {
      return semver.clean(max) || version;
    }
    issue('warning', `${version} did not match any release version.`);
  } else {
    issue('warning', `${version} is not a valid version or range.`);
  }
  return version;
}

async function setup() {
  try {
    const version = await getVersion();
    const mirror = getInput('mirror');
    const downloadObject = getDownloadObject(version, mirror);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmp'));

    // Download as 'opa' or 'opa.exe', whatever the platform/architecture specific name
    const target = path.join(dir, downloadObject.binaryName.endsWith('.exe') ? 'opa.exe' : 'opa');
    await download(downloadObject.url, target);
    fs.chmodSync(target, '755');

    // Expose the tool by adding it to the PATH
    fs.appendFileSync(process.env.GITHUB_PATH, `${dir}${os.EOL}`);

    process.stdout.write(`Setup Open Policy Agent CLI version ${version}${os.EOL}`);
  } catch (e) {
    issue('error', e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  setup();
}
