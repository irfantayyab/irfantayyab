const config = {
  "*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}":
    "eslint --fix --max-warnings=0 --no-warn-ignored",
  "*": "prettier --write --ignore-unknown",
};

export default config;
