import { OpfsFileSystem } from '../src/browser/index.js';

class BrowserOpfsExample {
  static async run(): Promise<void> {
    const fileSystem = OpfsFileSystem.create();
    const directory = 'substrate-opfs-demo';
    const path = `${directory}/message.txt`;

    await fileSystem.mkdir(directory);
    await fileSystem.writeFile(path, 'stored in OPFS');

    try {
      console.log({
        'entries': await fileSystem.readdir(directory),
        'message': await fileSystem.readFile(path)
      });
    } finally {
      await fileSystem.remove(directory);
    }
  }
}

await BrowserOpfsExample.run();
