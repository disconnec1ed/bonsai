#!/usr/bin/env node

import yargs from 'yargs';
import { Deployment, Environment } from '../common/environment';
import { turnedOffExperimentalWarning } from '../common/helpers';
import { startDAVerifierNode } from '../watchers/verifier.watcher';

turnedOffExperimentalWarning();

interface ProgramOptions {
  command: string;
  subcommands: string[];
  options: { [key: string]: string };
}

const getProgramArguments = (): ProgramOptions => {
  // tslint:disable-next-line: typedef
  const {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    _: [command, ...subcommands],
    ...options
  } = yargs.argv;
  return {
    command,
    options: Object.keys(options).reduce((r, v) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      r[v] = options[v];
      return r;
    }, {}),
    subcommands,
  };
};

const args = getProgramArguments();

const nodeUrl = args.options.node;
if (!nodeUrl) {
  console.log('No node url specified');
  process.exit(1);
}
const environment = (args.options.environment as Environment) || Environment.MUMBAI;
const deployment = (args.options.deployment as Deployment) || Deployment.PRODUCTION;

const concurrencyRaw = args.options.concurrency;
const concurrency = concurrencyRaw ? Number(concurrencyRaw) : 100;

const syncFromHeadOnlyRaw = args.options.fromHead;
const syncFromHeadOnly = syncFromHeadOnlyRaw ? Boolean(syncFromHeadOnlyRaw) : false;

startDAVerifierNode(
  {
    nodeUrl,
    environment,
    deployment,
  },
  concurrency,
  { syncFromHeadOnly }
).catch((error) => {
  console.error('DA verifier node failed to startup', error);
  process.exitCode = 1;
});
