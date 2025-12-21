import packageJson from "~/package.json";

export const useAppVersion = () => {
  const version = ref(packageJson.version);
  const name = ref(packageJson.name);

  return {
    version: readonly(version),
    name: readonly(name),
  };
};
