const { spawn, spawnSync } = require('child_process');
const path = require('path');

const backendDirectoryPath = path.resolve(__dirname, '..', 'backend');

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
  const isAirInstalled = checkAirAvailability();

  const runnerEnvironment = {
    ...process.env,
    HOST: process.env.HOST || '127.0.0.1'
  };

  if (isAirInstalled) {
    console.log('[backend-runner] [info] Air detected. Starting Go backend with hot reload...');
    activeChildProcess = spawn('air', [], {
      cwd: backendDirectoryPath,
      stdio: 'inherit',
      env: runnerEnvironment
    });
  } else {
    console.log('[backend-runner] [info] Air is not installed or disabled. Falling back to standard "go run ./cmd/server".');
    console.log('[backend-runner] [hint] To enable live hot reloading for the Go backend, install Air (v1.65.3):');
    console.log('                 go install github.com/air-verse/air@v1.65.3\n');

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
