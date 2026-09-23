const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendDirectoryPath = path.resolve(__dirname, '..', 'backend');
const backendEnvironmentFilePath = path.join(backendDirectoryPath, '.env');
const requestedRunnerMode = process.argv[2] || 'auto';

function loadBackendEnvironmentFile() {
  if (fs.existsSync(backendEnvironmentFilePath) && typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(backendEnvironmentFilePath);
    } catch (loadError) {
      console.warn('[backend-runner] [warn] Failed to load backend/.env:', loadError.message);
    }
  }
}

function checkAirAvailability() {
  if (process.env.DISABLE_AIR === 'true' || process.env.DISABLE_AIR === '1') {
    return false;
  }

  try {
    const airExecutionCheck = spawnSync('air', ['-v'], {
      stdio: 'ignore'
    });
    return airExecutionCheck.status === 0;
  } catch {
    return false;
  }
}

function startBackendServer() {
  loadBackendEnvironmentFile();

  if (!['auto', 'air', 'go'].includes(requestedRunnerMode)) {
    console.error(`[backend-runner] [error] Unsupported runner mode: ${requestedRunnerMode}`);
    process.exit(1);
  }

  const isAirInstalled = requestedRunnerMode === 'go' ? false : checkAirAvailability();
  if (requestedRunnerMode === 'air' && !isAirInstalled) {
    console.error('[backend-runner] [error] Air was explicitly requested but is not installed or is disabled.');
    console.error('[backend-runner] [hint] Install Air (v1.65.3):');
    console.error('                 go install github.com/air-verse/air@v1.65.3');
    process.exit(1);
  }

  const shouldUseAir = requestedRunnerMode === 'air'
    || (requestedRunnerMode === 'auto' && isAirInstalled);

  const runnerEnvironment = {
    ...process.env,
    HOST: process.env.HOST || '127.0.0.1',
    GIN_MODE: process.env.GIN_MODE || 'debug',
    APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:3000',
    AUTH_DISABLED: process.env.AUTH_DISABLED ?? (process.env.GOOGLE_CLIENT_ID ? 'false' : 'true'),
  };

  let activeChildProcess;

  if (shouldUseAir) {
    console.log('[backend-runner] [info] Starting Go backend with Air hot reload...');
    activeChildProcess = spawn('air', [], {
      cwd: backendDirectoryPath,
      stdio: 'inherit',
      env: runnerEnvironment
    });
  } else {
    if (requestedRunnerMode === 'auto') {
      console.log('[backend-runner] [info] Air is not installed or disabled. Falling back to standard "go run ./cmd/server".');
      console.log('[backend-runner] [hint] To enable live hot reloading for the Go backend, install Air (v1.65.3):');
      console.log('                 go install github.com/air-verse/air@v1.65.3\n');
    } else {
      console.log('[backend-runner] [info] Starting Go backend with standard "go run ./cmd/server".');
    }

    activeChildProcess = spawn('go', ['run', './cmd/server'], {
      cwd: backendDirectoryPath,
      stdio: 'inherit',
      env: runnerEnvironment
    });
  }

  const handleTerminationSignal = (signalName) => {
    if (activeChildProcess && !activeChildProcess.killed) {
      activeChildProcess.kill(signalName);
    }
  };

  process.on('SIGINT', () => handleTerminationSignal('SIGINT'));
  process.on('SIGTERM', () => handleTerminationSignal('SIGTERM'));

  activeChildProcess.on('exit', (exitCode, terminationSignal) => {
    if (terminationSignal) {
      process.exit(1);
    } else {
      process.exit(exitCode ?? 0);
    }
  });

  activeChildProcess.on('error', (processError) => {
    console.error('[backend-runner] [error] Failed to start backend process:', processError.message);
    process.exit(1);
  });
}

startBackendServer();
