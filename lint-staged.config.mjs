const config = {
  "*.{js,mjs,cjs,ts,tsx,mts,cts}": [
    "eslint --fix --max-warnings=0 --no-warn-ignored",
    "prettier --write",
  ],
  "*": "prettier --write --ignore-unknown",
};

export default config;
