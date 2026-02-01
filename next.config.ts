import type { NextConfig } from "next";
const withWorkflow = require("workflow/next").withWorkflow;

const nextConfig: NextConfig = {
  /* config options here */
};

export default withWorkflow(nextConfig);
