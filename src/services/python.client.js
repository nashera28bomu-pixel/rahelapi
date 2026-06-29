/**
 * @file services/python.client.js
 * @description Node.js → Python bridge client.
 * Spawns bridge.py as a child process with PYTHONPATH set to ./python_modules
 * so moviebox_api is always found regardless of where pip installed it.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import env from '../config/env.js';
import { ApiError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const BRIDGE_PATH = path.join(PROJECT_ROOT, env.python.bridgePath);
const PYTHON_MODULES = path.join(PROJECT_ROOT, 'python_modules');

/**
 * Call the Python bridge with an action and parameters.
 * @param {string} action
 * @param {object} params
 * @returns {Promise<any>}
 */
const callPython = (action, params = {}) => {
  return new Promise((resolve, reject) => {
    const command = JSON.stringify({ action, params });

    logger.debug(`[PythonClient] action=${action}`);

    const proc = spawn(env.python.cmd, [BRIDGE_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Tell Python exactly where our installed packages are
        PYTHONPATH: PYTHON_MODULES,
      },
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new ApiError(504, `Python bridge timed out after ${env.python.timeout}ms`));
    }, env.python.timeout);

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);

      if (stderr) logger.warn(`[PythonClient] stderr:\n${stderr.trim()}`);

      if (code !== 0 && !stdout) {
        return reject(new ApiError(502, `Python bridge exited with code ${code}`));
      }

      let parsed;
      try {
        parsed = JSON.parse(stdout.trim());
      } catch {
        return reject(new ApiError(502, `Python bridge returned invalid JSON`));
      }

      if (!parsed.success) {
        return reject(new ApiError(502, parsed.error || `Python bridge failed`));
      }

      resolve(parsed.data);
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new ApiError(502, `Failed to spawn Python: ${err.message}`));
    });

    proc.stdin.write(command);
    proc.stdin.end();
  });
};

export default { callPython };
