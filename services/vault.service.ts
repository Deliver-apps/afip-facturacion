import { getVaultClient } from '../external/vaultClient';
import { getUserByUsername } from './user.service';

export const loadUserCertificateAndKey = async (
  userId: string,
  key: string,
  cert: string
) => {
  const vaultClient = getVaultClient();
  const path = `secret/data/certificate/${userId}`;
  await vaultClient.write(path, {
    data: { key, cert },
  });
};

export const getUserCertificateAndKey = async (
  userId: number
): Promise<{
  key: string;
  cert: string;
}> => {
  const vaultClient = getVaultClient();
  const path = `secret/data/certificate/${userId}`;
  const result = await vaultClient.read(path);

  if (!result || !result.data || !result.data.data) {
    throw new Error('Certificate not found');
  }

  return result.data.data;
};

export const getOkFromVault = async (username: string) => {
  const user = await getUserByUsername(username);
  if (!user) {
    throw new Error('User not found');
  }
  const userId = user.id;
  const vaultClient = getVaultClient();
  const path = `secret/data/certificate/${userId}`;
  const result = await vaultClient.read(path);

  if (!result || !result.data || !result.data.data) {
    throw new Error('Ok not found');
  }

  return {
    status: 'success',
  };
};
