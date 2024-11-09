import fs from 'fs';
import path from 'path';

const usersDataPath = path.resolve('./data/users');

export function saveData(userId: string, data: any) {
  const filePath = path.join(usersDataPath, `user_${userId}.json`);
  const userData = loadData(userId) || {};

  console.log("USER_DATA", userData);

  // Verifique se `data` é um array; se não for, crie um array vazio
  const messagesToSave = Array.isArray(data) ? data : [];

  // Salve apenas se for um array
  userData.messages = [...(userData?.messages || []), ...messagesToSave];

  fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
}

export function loadData(userId: string): any {
  const filePath = path.join(usersDataPath, `user_${userId}.json`);

  if (fs.existsSync(filePath)) {
    const fileData = fs.readFileSync(filePath, 'utf-8');
    
    return JSON.parse(fileData);
  }
  return null;
}
