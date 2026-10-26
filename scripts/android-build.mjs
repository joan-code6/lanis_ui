import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const tasks = {
  apk: ['assembleDebug'],
  bundle: ['bundleRelease'],
  verify: ['assembleDebug', 'testDebugUnitTest', 'lintDebug'],
};
const mode = process.argv[2] || 'apk';
if (!Object.hasOwn(tasks, mode)) throw new Error('Choose apk, bundle, or verify.');
const args = [...tasks[mode], '--max-workers=2', '--console=plain'];
let aapt2 = process.env.LANIS_ANDROID_AAPT2;
if (!aapt2 && process.platform === 'linux' && process.arch === 'arm64') {
  const localTool = join(homedir(), '.local/share/lanis-android-tools/aapt2');
  if (existsSync(localTool)) aapt2 = localTool;
  else if (existsSync('/usr/bin/aapt2')) aapt2 = '/usr/bin/aapt2';
  else throw new Error('Linux ARM64 needs a native aapt2. Install the distribution aapt package or set LANIS_ANDROID_AAPT2 to a compatible executable.');
}
if (aapt2) {
  if (!existsSync(aapt2)) throw new Error('LANIS_ANDROID_AAPT2 does not exist.');
  args.push(`-Pandroid.aapt2FromMavenOverride=${aapt2}`);
}
const androidDir = fileURLToPath(new URL('../android/', import.meta.url));
// Invoke the wrapper directly on Windows: cmd AutoRun hooks can change cwd,
// and shell execution also breaks SDK/tool paths containing spaces.
const windows = process.platform === 'win32';
const command = windows ? (process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin/java.exe') : 'java.exe') : './gradlew';
const wrapperArgs = windows ? ['-classpath', join(androidDir, 'gradle/wrapper/gradle-wrapper.jar'), 'org.gradle.wrapper.GradleWrapperMain', ...args] : args;
const result = spawnSync(command, wrapperArgs, {
  cwd: androidDir,
  stdio: 'inherit',
  shell: false,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
