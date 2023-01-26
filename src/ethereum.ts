import { Block } from '@ethersproject/abstract-provider';
import { ethers } from 'ethers';
import { ClaimableValidatorError } from './claimable-validator-errors';
import { getLensHubContract, LENS_PROXY_MUMBAI_CONTRACT } from './contract-lens/lens-proxy-info';
import { failure, PromiseResult, success } from './da-result';
import { sleep } from './helpers';

const network = 'https://polygon-mumbai.g.alchemy.com/v2/lYqDZAMIfEqR6I7a6h6DmgkcP2ran6qW';

export const EMPTY_BYTE = '0x';

const MAIN_NODE_TIMEOUT = 2 * 1000;

export const ethereumProvider = new ethers.providers.StaticJsonRpcProvider(
  {
    url: network,
    // timeout after MAIN_NODE_TIMEOUT
    timeout: MAIN_NODE_TIMEOUT,
    throttleLimit: MAIN_NODE_TIMEOUT,
  },
  80001
);

export const executeSimulationTransaction = async (
  data: string,
  blockNumber: number
): PromiseResult<string | void> => {
  try {
    const transaction: ethers.providers.TransactionRequest = {
      to: LENS_PROXY_MUMBAI_CONTRACT,
      data,
    };

    const result = await ethereumProvider.call(transaction, blockNumber);

    return success(result);
  } catch (_error) {
    return failure(ClaimableValidatorError.SIMULATION_NODE_COULD_NOT_RUN);
  }
};

export const parseSignature = (signature: string, deadline: number) => {
  const splitSign = ethers.utils.splitSignature(signature);
  return {
    r: splitSign.r,
    s: splitSign.s,
    v: splitSign.v,
    deadline,
  };
};

export const getOnChainProfileDetails = async (
  blockNumber: number,
  profileId: string,
  signedByAddress: string
): Promise<{
  sigNonce: number;
  currentPublicationId: string;
  dispatcherAddress: string;
  ownerOfAddress: string;
}> => {
  const lensHubContract = getLensHubContract();
  // get the current sig nonce of signed by address
  // get the current publication count
  // get the current dispatcher address
  // get the current owner address
  const [sigNonce, currentPublicationId, dispatcherAddress, ownerOfAddress] = await Promise.all([
    lensHubContract.sigNonces(signedByAddress, { blockTag: blockNumber }),
    lensHubContract.getPubCount(profileId, { blockTag: blockNumber }),
    lensHubContract.getDispatcher(profileId, { blockTag: blockNumber }),
    lensHubContract.ownerOf(profileId, { blockTag: blockNumber }),
  ]);

  return {
    sigNonce: sigNonce.toNumber(),
    currentPublicationId: currentPublicationId.toHexString(),
    dispatcherAddress,
    ownerOfAddress,
  };
};

const MAX_BLOCK_RETRIES = 3;

export const getBlockWithRetries = async (
  blockNumber: number,
  attempt: number = 0
): Promise<Block> => {
  try {
    return await ethereumProvider.getBlock(blockNumber);
  } catch (e) {
    if (attempt < MAX_BLOCK_RETRIES) {
      await sleep(100);
      return getBlockWithRetries(attempt + 1);
    } else {
      throw e;
    }
  }
};
