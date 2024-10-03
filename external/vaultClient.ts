import Vault from 'node-vault';
import { config } from '../config/config';

export function getVaultClient() {
  const VAULT_ADDRESS = config.vaultAddress;
  const VAULT_TOKEN = config.vaultToken;

  if (!VAULT_ADDRESS || !VAULT_TOKEN) {
    throw new Error(
      'VAULT_ADDRESS and VAULT_TOKEN must be set in environment variables'
    );
  }

  return Vault({
    apiVersion: 'v1',
    endpoint: VAULT_ADDRESS,
    token: VAULT_TOKEN,
  });
}
