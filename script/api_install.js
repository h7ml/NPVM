// 支持环境变量配置 API 地址
const BASE_URL = process.env.NPVM_API_BASE || "https://npvm.zeabur.app/api";

// 100 个包列表，包含已知漏洞版本和常用包
const packagesToInstall = [
  "lodash@4.17.11", "axios@0.18.0", "moment@2.29.1", "jquery@3.4.0", "minimist@1.2.0",
  "serialize-javascript@3.0.0", "node-fetch@2.6.0", "qs@6.7.0", "yargs-parser@13.1.1", "kind-of@6.0.2",
  "braces@2.3.1", "mixin-deep@1.3.1", "set-value@2.0.0", "union-value@1.0.0", "dot-prop@4.2.0",
  "cryptiles@4.1.2", "hoek@4.2.0", "boom@4.3.1", "sntp@2.1.0", "hawk@6.0.1",
  "request@2.88.0", "tough-cookie@2.4.3", "js-yaml@3.13.0", "handlebars@4.1.2", "bl@1.2.2",
  "tar@4.4.1", "fstream@1.0.11", "unzip@0.1.11", "adm-zip@0.4.11", "ws@6.2.1",
  "socket.io@2.3.0", "express@4.16.0", "body-parser@1.18.2", "validator@10.10.0", "marked@0.6.1",
  "dompurify@2.0.0", "is-my-json-valid@2.19.0", "ajv@6.10.0", "deep-extend@0.5.1", "merge@1.2.0",
  "extend@3.0.1", "defaults-deep@0.2.3", "assign-deep@0.4.5", "merge-deep@3.0.1", "mixin-object@2.0.1",
  "shallow-clone@0.1.2", "clone-deep@0.2.4", "base@0.11.1", "static-extend@0.1.1", "react",
  "react-dom", "vue", "angular", "svelte", "next", "nuxt", "gatsby", "typescript", "webpack", "vite",
  "rollup", "esbuild", "babel-core", "eslint", "prettier", "jest", "cypress", "mocha", "chai",
  "styled-components", "emotion", "tailwindcss", "sass", "less", "redux", "mobx", "recoil", "zustand",
  "jotai", "react-query", "swr", "apollo-client", "graphql", "react-router-dom", "vue-router", "history",
  "formik", "react-hook-form", "zod", "yup", "date-fns", "dayjs", "luxon", "classnames", "clsx",
  "ramda", "underscore", "chalk", "debug", "commander", "fs-extra", "glob"
];

async function installPackages(pkgs) {
  const url = `${BASE_URL}/packages/install`;
  const payload = {
    packages: pkgs,
    dev: false
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(300000) // 300 秒超时
    });

    console.log(`请求状态码: ${response.status}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 处理 SSE 流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // 保留最后一个不完整的行
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          console.log(line);
        }
      }
    }

    // 处理剩余的 buffer
    if (buffer.trim()) {
      console.log(buffer);
    }

  } catch (error) {
    console.error(`安装过程中出现错误: ${error.message}`);
  }
}

async function main() {
  // 分批安装，每批 20 个，避免超时或负载过重
  const batchSize = 20;

  for (let i = 0; i < packagesToInstall.length; i += batchSize) {
    const batch = packagesToInstall.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    console.log(`正在安装第 ${batchNumber} 批包: ${batch.join(', ')}`);
    await installPackages(batch);

    // 稍微等待一下
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

main().catch(console.error);
