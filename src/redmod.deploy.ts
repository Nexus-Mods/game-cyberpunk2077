import {
  spawn,
} from "child_process";
import path from "path/win32";
import {
  fs,
} from "@vortex-api-test-shimmed";
import {
  REDdeployExeRelativePath,
  REDlauncherExeRelativePath,
  REDMODDING_REQUIRED_DIR_FOR_GENERATED_FILES,
  REDMODDING_RTTI_METADATA_FILE_PATH,
  V2077_MODLIST_PATH,
} from "./redmodding.metadata";
import {
  VortexApi,
} from "./vortex-wrapper";

export interface REDmodDeployOutcome {
  exitCode: number | null;
  output: string;
}

// redMod takes the root as a separate argument, every other flag with `=`.
export const redmodDeployArgs = (gameDirPath: string): string[] => [
  `deploy`,
  `-reportProgress`,
  `-root`,
  gameDirPath,
  `-rttiSchemaPath=${path.join(gameDirPath, REDMODDING_RTTI_METADATA_FILE_PATH)}`,
  `-modlist=${path.join(gameDirPath, V2077_MODLIST_PATH)}`,
];

export const redmodDeployExe = (gameDirPath: string): string =>
  path.join(gameDirPath, REDdeployExeRelativePath);

// The one answer to 'can this install load REDmods', so that setup, the
// conversion action and anything else agree on it.
export const redmodToolingIsInstalled = async (gameDirPath: string): Promise<boolean> => {
  const everyFileREDmoddingNeeds = [REDlauncherExeRelativePath, REDdeployExeRelativePath];

  // Each stat is caught on its own: a bare Promise.all over rejecting stats
  // settles on the first and leaves the rest unhandled.
  const eachFileIsThere = await Promise.all(
    everyFileREDmoddingNeeds.map(async (file) => {
      try {
        await fs.statAsync(path.join(gameDirPath, file));
        return true;
      } catch {
        return false;
      }
    }),
  );

  return eachFileIsThere.every((isThere) => isThere);
};

// redMod rebuilds what changed, but doesn't notice a reordering on its own.
export const redmodDeployedFilesNeedRebuilding = (
  previousModList: readonly string[],
  nextModList: readonly string[],
): boolean => {
  const sameMods =
    [...previousModList].sort().join(`\n`) === [...nextModList].sort().join(`\n`);

  return sameMods && previousModList.join(`\n`) !== nextModList.join(`\n`);
};

export const removeDeployedREDmodFiles = async (
  vortexApi: VortexApi,
  gameDirPath: string,
): Promise<void> => {
  const deployedFilesDir = path.join(gameDirPath, REDMODDING_REQUIRED_DIR_FOR_GENERATED_FILES);

  vortexApi.log(`info`, `Removing deployed REDmod files in ${deployedFilesDir}`);

  try {
    await fs.removeAsync(deployedFilesDir);
    await fs.ensureDirWritableAsync(deployedFilesDir);
  } catch (error) {
    vortexApi.log(`warn`, `Unable to remove deployed REDmod files, deploying anyway`, error);
  }
};

// Spawned without a shell: no console window, no command line length cap.
export const runREDmodDeploy = (
  vortexApi: VortexApi,
  gameDirPath: string,
): Promise<REDmodDeployOutcome> =>
  new Promise((resolve, reject) => {
    const executable = redmodDeployExe(gameDirPath);
    const args = redmodDeployArgs(gameDirPath);

    vortexApi.log(`debug`, `Running ${executable} ${args.join(` `)}`);

    const redmod = spawn(executable, args, {
      cwd: path.dirname(executable),
      windowsHide: true,
    });

    const collected: string[] = [];
    const collect = (chunk: Buffer): void => { collected.push(chunk.toString()); };

    redmod.stdout?.on(`data`, collect);
    redmod.stderr?.on(`data`, collect);

    redmod.on(`error`, reject);

    redmod.on(`close`, (exitCode) => {
      resolve({ exitCode, output: collected.join(``).trim() });
    });
  });
