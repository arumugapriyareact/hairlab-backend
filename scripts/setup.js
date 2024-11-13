// scripts/setup.js
const fs = require('fs');
const path = require('path');

console.log('Starting setup process...');

// Function to create directory if it doesn't exist
const createDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    } catch (error) {
      console.error(`Error creating directory ${dirPath}:`, error);
      throw error;
    }
  } else {
    console.log(`Directory already exists: ${dirPath}`);
  }
};

// Function to create required directories
const setupDirectories = () => {
  const rootDir = path.join(__dirname, '..');
  
  // Define directories to create
  const directories = [
    'public',
    'public/uploads',
    'public/uploads/carousel'
  ];

  console.log('Creating required directories...');
  
  directories.forEach(dir => {
    const fullPath = path.join(rootDir, dir);
    createDirectory(fullPath);
  });
};

// Function to check and set proper permissions
const setPermissions = () => {
  const uploadPath = path.join(__dirname, '..', 'public', 'uploads');
  
  try {
    // 0755 gives read & execute access to everyone and also write access to owner
    fs.chmodSync(uploadPath, '0755');
    console.log('Set permissions for uploads directory');
  } catch (error) {
    console.error('Error setting permissions:', error);
    throw error;
  }
};

// Function to create .gitkeep file
const createGitKeep = () => {
  const carouselPath = path.join(__dirname, '..', 'public', 'uploads', 'carousel', '.gitkeep');
  
  try {
    fs.writeFileSync(carouselPath, '');
    console.log('Created .gitkeep file in carousel directory');
  } catch (error) {
    console.error('Error creating .gitkeep file:', error);
    throw error;
  }
};

// Main setup function
const runSetup = async () => {
  try {
    console.log('Starting directory setup...');
    setupDirectories();
    
    console.log('Setting directory permissions...');
    setPermissions();
    
    console.log('Creating .gitkeep file...');
    createGitKeep();
    
    console.log('\nSetup completed successfully!');
    console.log('\nDirectory structure created:');
    console.log(`
project_root/
├── public/
│   └── uploads/
│       └── carousel/
│           └── .gitkeep
    `);
  } catch (error) {
    console.error('\nSetup failed:', error);
    process.exit(1);
  }
};

// Run setup
runSetup();