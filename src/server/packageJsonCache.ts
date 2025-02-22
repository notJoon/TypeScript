import {
    combinePaths, createPackageJsonInfo, Debug, forEachAncestorDirectory, getDirectoryPath, Path,
    ProjectPackageJsonInfo, Ternary, tryFileExists,
} from "./_namespaces/ts";
import { ProjectService } from "./_namespaces/ts.server";

/** @internal */
export interface PackageJsonCache {
    addOrUpdate(fileName: Path): void;
    forEach(action: (info: ProjectPackageJsonInfo, fileName: Path) => void): void;
    delete(fileName: Path): void;
    get(fileName: Path): ProjectPackageJsonInfo | false | undefined;
    getInDirectory(directory: Path): ProjectPackageJsonInfo | undefined;
    directoryHasPackageJson(directory: Path): Ternary;
    searchDirectoryAndAncestors(directory: Path): void;
}

/** @internal */
export function createPackageJsonCache(host: ProjectService): PackageJsonCache {
    const packageJsons = new Map<string, ProjectPackageJsonInfo>();
    const directoriesWithoutPackageJson = new Map<string, true>();
    return {
        addOrUpdate,
        forEach: packageJsons.forEach.bind(packageJsons),
        get: packageJsons.get.bind(packageJsons),
        delete: fileName => {
            packageJsons.delete(fileName);
            directoriesWithoutPackageJson.set(getDirectoryPath(fileName), true);
        },
        getInDirectory: directory => {
            return packageJsons.get(combinePaths(directory, "package.json")) || undefined;
        },
        directoryHasPackageJson,
        searchDirectoryAndAncestors: directory => {
            forEachAncestorDirectory(directory, ancestor => {
                if (directoryHasPackageJson(ancestor) !== Ternary.Maybe) {
                    return true;
                }
                const packageJsonFileName = host.toPath(combinePaths(ancestor, "package.json"));
                if (tryFileExists(host, packageJsonFileName)) {
                    addOrUpdate(packageJsonFileName);
                }
                else {
                    directoriesWithoutPackageJson.set(ancestor, true);
                }
            });
        },
    };

    function addOrUpdate(fileName: Path) {
        const packageJsonInfo = Debug.checkDefined(createPackageJsonInfo(fileName, host.host));
        packageJsons.set(fileName, packageJsonInfo);
        directoriesWithoutPackageJson.delete(getDirectoryPath(fileName));
    }

    function directoryHasPackageJson(directory: Path) {
        return packageJsons.has(combinePaths(directory, "package.json")) ? Ternary.True :
            directoriesWithoutPackageJson.has(directory) ? Ternary.False :
            Ternary.Maybe;
    }
}
