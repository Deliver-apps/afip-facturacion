import { getVaultClient } from '../external/vaultClient';

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
