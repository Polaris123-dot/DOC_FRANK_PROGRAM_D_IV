import express from "express";
import mysql from "mysql2/promise"; // Importar la versión de promesas
import cors from "cors";
import session from "express-session";
import bcrypt from "bcrypt";

const app = express();
app.use(express.json());

// Configuración de CORS para permitir credenciales
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

// Configuración de sesiones
app.use(session({
    secret: "mi-secreto-super-seguro-cambiar-en-produccion", // En producción, usar variable de entorno
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Cambiar a true si usas HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

app.use(express.static("public"));

// Configuración del Pool de Conexiones (¡Recomendado!)
// El Pool gestiona eficientemente la apertura y cierre (liberación) de conexiones.
const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "1234",
    database: "sis_notas",
    waitForConnections: true,
    connectionLimit: 10, // Un límite para el número máximo de conexiones activas
    queueLimit: 0
});

// Probar el Pool de Conexiones al iniciar el servidor
pool.getConnection()
    .then(connection => {
        console.log("✅ Pool de conexiones listo. Conexión de prueba exitosa.");
        connection.release(); // Importante: liberar la conexión de prueba
    })
    .catch(err => {
        console.error("❌ Error al inicializar el Pool de MySQL:", err);
        // Opcional: Cerrar el proceso si la base de datos no está disponible
        process.exit(1); 
    });

// ----------------------------------------------------------------------
// 🔐 MIDDLEWARES DE AUTENTICACIÓN Y AUTORIZACIÓN
// ----------------------------------------------------------------------

// Middleware: Verificar si el usuario está autenticado
const requireAuth = (req, res, next) => {
    if (req.session && req.session.docente) {
        return next(); // Usuario autenticado, permitir acceso
    }
    return res.status(401).json({ 
        ok: false, 
        mensaje: "❌ No autorizado. Debe iniciar sesión." 
    });
};

// Middleware: Verificar rol del usuario (DESACTIVADO - no hay columna de roles en BD)
// Para usar, necesitas agregar la columna 'rol' a la tabla Docentes
/*
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.session || !req.session.docente) {
            return res.status(401).json({ 
                ok: false, 
                mensaje: "❌ No autorizado. Debe iniciar sesión." 
            });
        }

        const userRole = req.session.docente.rol || 'docente';
        
        if (!roles.includes(userRole)) {
            return res.status(403).json({ 
                ok: false, 
                mensaje: "❌ Acceso denegado. No tiene permisos suficientes." 
            });
        }

        next(); // Usuario tiene el rol requerido
    };
};
*/


// ----------------------------------------------------------------------
// 🔒 Ruta de Login (Apertura y Cierre por Solicitud)
// ----------------------------------------------------------------------
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    let connection; // Variable para almacenar la conexión obtenida del pool

    try {
        // 1. Apertura: Obtener una conexión del Pool
        connection = await pool.getConnection();

        // 2. Consulta Preparada
        const sql = `
            SELECT id_docente, nombre, apellido, password 
            FROM Docentes 
            WHERE email = ?
        `;
        const [results] = await connection.execute(sql, [email]);

        if (results.length === 0) {
            return res.json({ ok: false, mensaje: "❌ Credenciales incorrectas" });
        }
        
        const docente = results[0];
        
        // Comparación de contraseñas
        // TODO: Implementar bcrypt.hash() y bcrypt.compare() en producción
        if (docente.password === password) {
            // Crear sesión del usuario
            req.session.docente = {
                id_docente: docente.id_docente,
                nombre: docente.nombre,
                apellido: docente.apellido
            };

            console.log(`✅ Sesión creada para: ${docente.nombre} ${docente.apellido}`);

            res.json({ 
                ok: true, 
                mensaje: "✅ Acceso concedido", 
                docente: {
                    id_docente: docente.id_docente,
                    nombre: docente.nombre,
                    apellido: docente.apellido
                }
            });
        } else {
            res.json({ ok: false, mensaje: "❌ Credenciales incorrectas" });
        }

    } catch (err) {
        console.error("Error en la consulta de Login:", err);
        res.status(500).json({ ok: false, mensaje: "Error interno en el servidor" });
    } finally {
        // 3. Cierre: Liberar la conexión al Pool para que pueda ser reusada
        if (connection) {
            connection.release(); 
            console.log("Conexión liberada después de LOGIN.");
        }
    }
});

// ----------------------------------------------------------------------
// 🚪 Ruta de Logout
// ----------------------------------------------------------------------
app.post("/logout", (req, res) => {
    if (req.session.docente) {
        console.log(`👋 Sesión cerrada para: ${req.session.docente.nombre}`);
    }
    req.session.destroy((err) => {
        if (err) {
            console.error("Error al destruir sesión:", err);
            return res.status(500).json({ ok: false, mensaje: "Error al cerrar sesión" });
        }
        res.json({ ok: true, mensaje: "Sesión cerrada correctamente" });
    });
});

// ----------------------------------------------------------------------
// ✅ Ruta de verificación de sesión
// ----------------------------------------------------------------------
app.get("/api/session", (req, res) => {
    if (req.session && req.session.docente) {
        res.json({ 
            ok: true, 
            docente: req.session.docente,
            autenticado: true 
        });
    } else {
        res.json({ ok: false, autenticado: false });
    }
});

// ----------------------------------------------------------------------
// 📘 Ruta para obtener las asignaciones del docente
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// 📘 Ruta para obtener las asignaciones del docente (YA EXISTENTE)
// ----------------------------------------------------------------------
app.get("/asignaciones/:id_docente", requireAuth, async (req, res) => {
    const id_docente = parseInt(req.params.id_docente, 10); 
    let connection;

    // Verificar si el ID es válido antes de consultar la BD
    if (isNaN(id_docente)) {
        return res.status(400).json({ ok: false, mensaje: "ID de docente inválido." });
    }

    try {
        connection = await pool.getConnection();

        // **CONSULTA CORREGIDA**
        const sql = `
        SELECT 
            a.id_asignacion,
            c.id_curso,
            c.nombre AS nombre_curso,
            a.periodo,
            a.seccion,
            al.id_alumno,
            CONCAT(al.nombre, ' ', al.apellido) AS nombre_alumno
        FROM asignaciones a
        JOIN cursos c        ON a.id_curso = c.id_curso
        JOIN inscripciones i ON i.id_asignacion = a.id_asignacion
        JOIN alumnos al      ON al.id_alumno = i.id_alumno
        WHERE a.id_docente = ?
        ORDER BY c.nombre, a.periodo, a.seccion, nombre_alumno;

        `;
        const [rows] = await connection.execute(sql, [id_docente]);

        res.json({ ok: true, asignaciones: rows });

    } catch (err) {
        console.error("❌ Error al obtener asignaciones:", err);
        // Devolvemos el error de la BD al cliente (no en producción)
        res.status(500).json({ ok: false, mensaje: "Error al obtener asignaciones. Revise la consola del servidor." });
    } finally {
        if (connection) connection.release();
        console.log("Conexión liberada después de GET ASIGNACIONES.");
    }
});


// ----------------------------------------------------------------------
// 👥 RUTA NUEVA: Obtener alumnos inscritos por asignación
// ----------------------------------------------------------------------
// Esta ruta se llama desde alumnos.html usando el id_asignacion
app.get("/asignaciones/:id_asignacion/alumnos", requireAuth, async (req, res) => {
    // 1. Extraer y validar el ID de la asignación
    const id_asignacion = parseInt(req.params.id_asignacion, 10);
    let connection;

    if (isNaN(id_asignacion)) {
        return res.status(400).json({ ok: false, mensaje: "ID de asignación inválido." });
    }

    try {
        // 2. Apertura: Obtener conexión del Pool
        connection = await pool.getConnection();

        // 3. Consulta Preparada: Une Inscripciones con Alumnos
        const sql = `
            SELECT 
                i.id_inscripcion,
                a.id_alumno,
                a.nombre,
                a.apellido,
                a.dni
            FROM Inscripciones i
            JOIN Alumnos a ON i.id_alumno = a.id_alumno
            WHERE i.id_asignacion = ?
            ORDER BY a.apellido, a.nombre
        `;
        const [rows] = await connection.execute(sql, [id_asignacion]);

        // 4. Respuesta
        res.json({ ok: true, alumnos: rows });
    } catch (err) {
        console.error(`❌ ERROR DETALLADO al obtener alumnos para asignación ${id_asignacion}:`, err);
        res.status(500).json({ 
            ok: false, 
            mensaje: "Error interno del servidor al obtener la lista de alumnos." 
        });
    } finally {
        // 5. Cierre: Liberar la conexión al Pool
        if (connection) connection.release();
        console.log(`Conexión liberada después de GET ALUMNOS para asignación ${id_asignacion}.`);
    }
});

// ----------------------------------------------------------------------
// 📝 RUTA NUEVA: Registrar o actualizar nota (por inscripción y tipo de nota)
// ----------------------------------------------------------------------
app.post("/notas", requireAuth, async (req, res) => {
    const { id_inscripcion, id_tipo_nota, valor } = req.body;
    let connection;

    // Validaciones básicas
    if (!id_inscripcion || !id_tipo_nota || isNaN(valor)) {
        return res.status(400).json({
            ok: false,
            mensaje: "Datos inválidos: se requiere id_inscripcion, id_tipo_nota y valor numérico.",
        });
    }

    try {
        connection = await pool.getConnection();

        // 🔍 Verificar si ya existe una nota para esa inscripción y tipo
        const checkSQL = `
            SELECT id_nota 
            FROM notas 
            WHERE id_inscripcion = ? AND id_tipo_nota = ?
        `;
        const [existe] = await connection.execute(checkSQL, [id_inscripcion, id_tipo_nota]);

        if (existe.length > 0) {
            // 🟡 Si ya existe → se actualiza
            const updateSQL = `
                UPDATE notas 
                SET valor = ?, fecha_registro = CURDATE()
                WHERE id_inscripcion = ? AND id_tipo_nota = ?
            `;
            await connection.execute(updateSQL, [valor, id_inscripcion, id_tipo_nota]);
            res.json({ ok: true, mensaje: "Nota actualizada correctamente." });
        } else {
            // 🟢 Si no existe → se inserta
            const insertSQL = `
                INSERT INTO notas (id_inscripcion, id_tipo_nota, valor, fecha_registro)
                VALUES (?, ?, ?, CURDATE())
            `;
            await connection.execute(insertSQL, [id_inscripcion, id_tipo_nota, valor]);
            res.json({ ok: true, mensaje: "Nota registrada correctamente." });
        }

    } catch (err) {
        console.error("❌ Error al registrar o actualizar nota:", err);
        res.status(500).json({
            ok: false,
            mensaje: "Error interno del servidor al registrar la nota.",
        });
    } finally {
        if (connection) connection.release();
    }
});



// ----------------------------------------------------------------------
// Servidor
// ----------------------------------------------------------------------
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));