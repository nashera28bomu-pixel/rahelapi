/**
 * @file services/python.client.js
 * @description Node.js ↔ Python bridge client.
 *
 * The moviebox-api is a Python library, not a REST API.
 * This client spawns the Python bridge script as a child process,
 * sends a JSON command via stdin, and reads the JSON response from stdout.
 *
 * Architecture:
 *   Node.js → [JSON command over stdin] → Python bridge.py → moviebox-api
 *   Node.js ← [JSON response over stdout] ← Python bridge.py
 *
 * This isolates ALL Python-specific logic from the Node.js application.
 * If we ever move to a REST-based provider, only this file needs to change.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import env from '../config/env.js';
import { ApiError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRIDGE_PATH = path.resolve(__dirname, '../../', env.python.bridgePath);

/**
 * Call the Python bridge with an action and parameters.
 * Spawns a Python child process, sends a JSON command, and parses the response.
 *
 * @param {string} action - The action key (e.g. 'search', 'movie_details')
 * @param {object} params - Parameters for the action
 * @returns {Promise<any>} The parsed `data` field from the Python response
 * @throws {ApiError} On Python errors, timeouts, or malformed responses
 */
const callPython = (action, params = {}) => {
  return new Promise((resolve, reject) => {
    const command = JSON.stringify({ action, params });

    logger.debug(`[PythonClient] Spawning bridge: action=${action}`);

    const proc = spawn(env.python.cmd, [BRIDGE_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    // Timeout guard — kill the process if it takes too long
    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(
        new ApiError(
          504,
          `Python bridge timed out after ${env.python.timeout}ms for action: ${action}`
        )
      );
    }, env.python.timeout);

    // Collect stdout
    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    // Collect stderr (Python errors / tracebacks)
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    // Process finished
    proc.on('close', (code) => {
      clearTimeout(timer);

      if (stderr) {
        logger.warn(`[PythonClient] stderr from action=${action}:\n${stderr.trim()}`);
      }

      if (code !== 0 && !stdout) {
        return reject(
          new ApiError(
            502,
            `Python bridge exited with code ${code} for action: ${action}`
          )
        );
      }

      let parsed;
      try {
        parsed = JSON.parse(stdout.trim());
      } catch {
        return reject(
          new ApiError(502, `Python bridge returned invalid JSON for action: ${action}`)
        );
      }

      if (!parsed.success) {
        return reject(
          new ApiError(502, parsed.error || `Python bridge failed for action: ${action}`)
        );
      }

      logger.debug(`[PythonClient] Success: action=${action}`);
      resolve(parsed.data);
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(
        new ApiError(
          502,
          `Failed to spawn Python process: ${err.message}. Is Python installed?`
        )
      );
    });

    // Send the command via stdin and close it
    proc.stdin.write(command);
    proc.stdin.end();
  });
};

export default { callPython };
