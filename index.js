const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
const port = 3000;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

async function createTables() {
  try {
    const connection = await mysql.createConnection(dbConfig);

    // Creando la tabla 1
    await connection.query(`CREATE TABLE IF NOT EXISTS Tabla1 (
      id INT PRIMARY KEY AUTO_INCREMENT,
      paises VARCHAR(255),
      continente INT
    )`);

    // Creando la tabla 2
    await connection.query(`CREATE TABLE IF NOT EXISTS Tabla2 (
      id INT PRIMARY KEY AUTO_INCREMENT,
      cliente VARCHAR(255),
      folio INT
    )`);

    // Creando la tabla 3
    await connection.query(`CREATE TABLE IF NOT EXISTS Tabla3 (
      id INT PRIMARY KEY AUTO_INCREMENT,
      UNIDIM VARCHAR(255)
    )`);

    console.log('Tablas creadas correctamente mai doo 🐶');
    connection.end();
  } catch (error) {
    console.error('Error al crear tablas verifica tus datos:', error);
  }
}

createTables();

//INICIO DE ENDPOINTS

// Aqui hacemmos la peticion GET para mostar los datos de las tablas 
app.get('/data', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    const [rowsTabla1] = await connection.execute('SELECT * FROM Tabla1');
    const [rowsTabla2] = await connection.execute('SELECT * FROM Tabla2');
    const [rowsTabla3] = await connection.execute('SELECT * FROM Tabla3');

    connection.end();

    const responseData = {
      tabla1: rowsTabla1,
      tabla2: rowsTabla2,
      tabla3: rowsTabla3,
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.status(500).send('Error al obtener datos');
  }
});


// Aqui hacemmos la peticion POST para subir el archivo y guardar los datos en las tablas
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const connection = await mysql.createConnection(dbConfig);

    for (const data of sheetData) {
      console.log('Datos de la fila:', data);

      // Insertar datos en tabla 1
      await connection.query('INSERT INTO Tabla1 (paises, continente) VALUES (?, ?)', [data.paises, data.continente]);

      // Insertar datos en tabla 2
      await connection.query('INSERT INTO Tabla2 (cliente, folio) VALUES (?, ?)', [data.cliente, data.folio]);

      // Insertar datos en tabla 3
      await connection.query('INSERT INTO Tabla3 (UNIDIM) VALUES (?)', [data.UNIDIM]);
    }

    fs.unlinkSync(filePath); // Aqui se elimina archivo subido después de procesarlo
    connection.end();
    res.send('Datos almacenados correctamente, eres un AS 🦝');
  } catch (error) {
    //Manejo de errores en caso de no subir el archivo correctamente
    console.error('Error al subir archivo y guardar datos:', error);
    res.status(500).send('Error al subir archivo y guardar datos ⛔');
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
