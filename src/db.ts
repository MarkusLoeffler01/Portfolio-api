import mariadb from 'mariadb';
import { checkEnvVariables } from './modules/envs';
import { DBError } from './modules/exceptions';
import type Comment from './interfaces/comment';
import type Data from './interfaces/data';


class DatabaseService<T> implements Disposable {
    private pool: mariadb.Pool;
    private tableName: string;

    constructor(pool: mariadb.Pool, tableName: string) {
        this.pool = pool;
        this.tableName = tableName;
    }

    public async healthCheck() {
        let con: mariadb.PoolConnection | undefined;
        try {
            con = await this.pool.getConnection();
            await con.ping();
            con.query("CREATE TABLE IF NOT EXISTS users (userid BIGINT UNSIGNED NOT NULL, name VARCHAR(255) NOT NULL, PRIMARY KEY (userid))");
            return true;
        }
        catch (err) {
            console.error("Database health check failed:", err);
            return false;
        }
        /* c8 ignore next 3 */
        finally {
            con?.release();
        }
    }

    public async initialConnect() {
        const healthy = await this.healthCheck();
        if (!healthy) {
            throw new Error("Failed to connect to database");
        }
        return this.pool.getConnection();
    }

    /** @throws {DBError} */
    public async insertData(data: Partial<T> & { content: string, author: string }): Promise<void> {
        let con: mariadb.PoolConnection | undefined;
        const fields = Object.keys(data).join(', ');
        const values = Object.values(data);
        const placeholders = values.map(() => '?').join(', ');
        const query = `INSERT INTO ${this.tableName} (${fields}) VALUES (${placeholders})`;
        try {
            con = await this.pool.getConnection();
            await con.query(query, values);
        }
        catch (err) {
            console.error(`Failed to insert data into ${this.tableName}:`, err);
            throw new DBError(err, "store");
        }
        finally {
            /* c8 ignore next */
            con?.release();
        }
    }

    public async updateData(data: Partial<Data> & { id: string }): Promise<void> {
        let con: mariadb.PoolConnection | undefined;

        const fields = Object.keys(data)
            .filter((field): field is keyof typeof data => field !== 'id') // TypeScript-konformes Filtern von 'id'
            .map(field => `${field} = ?`)
            .join(', ');

        const values = Object.keys(data)
            .filter((field): field is keyof typeof data => field !== 'id') // Filtert das 'id'-Feld aus den Schlüsseln
            .map(field => data[field] as string); // Holt die entsprechenden Werte


        const query = `UPDATE ${this.tableName} SET ${fields}, updatedAt = current_timestamp() WHERE id = ?;`;
        values.push(data.id); // Add commentID to the values array

        if (!fields) {
            throw new Error("No data provided to update");
        }

        try {
            con = await this.pool.getConnection();
            await con.query(query, values);
        } catch (err) {
            console.error(`Failed to update data of ${this.tableName}:`, err);
            throw new DBError(err, "update");
        }
        finally {
            /* c8 ignore next */
            con?.release();
        }
    }

    /** @throws {DBError} */
    public async deleteData(query: { id: string } & Partial<Omit<Comment, "id">>) {
        let con: mariadb.PoolConnection | undefined;
        try {
            const con = await this.pool.getConnection();
            await con.query(`UPDATE TABLE ${this.tableName} SET delete = 1 WHERE id = ?`, [query.id]);
        }
        catch (err) {
            console.error("Failed to delete data:", err);
            throw new DBError(err, "delete");
        }
        finally {
            /* c8 ignore next */
            con?.release();
        }
    }

    /** @throws {DBError} */
    public async getDataByValue<K extends keyof T>(field: "id" | K, value: T[K]): Promise<T[] | T | null> {
        let con: mariadb.PoolConnection | undefined;
        try {
            con = await this.pool.getConnection();
            const query = `SELECT * FROM ${this.tableName} WHERE ${String(field)} = ?`;
            const result = await con.query<T[]>(query, [value]);
            if (field === "id") return result.length > 0 ? result[0] : null;
            return result.length > 0 ? result : null;
        } catch (err) {
            console.error(`Failed to get data from ${this.tableName} by ${String(field)}:`, err);
            throw new DBError(err, "get");
        } finally {
            con?.release();
        }
    }

    public async getDataByRange(page: number, perPage: number): Promise<{ data: T[], totalCount: number }> {
        let con: mariadb.PoolConnection | undefined;
        try {
            con = await this.pool.getConnection();

            // Berechnung von OFFSET basierend auf Seite und Anzahl der Einträge pro Seite
            const startIndex = (page - 1) * perPage;

            // // Abfrage mit LIMIT und OFFSET für Pagination
            // const query = `SELECT * FROM ${this.tableName} LIMIT ? OFFSET ?`;
            // const result = await con.query<T[]>(query, [perPage, startIndex]);

            // // Gesamtanzahl der Einträge ermitteln
            // const totalCountQuery = `SELECT COUNT(*) AS totalCount FROM ${this.tableName}`;
            // const totalCountResult = (await con.query<{ totalCount: number }[]>(totalCountQuery))[0];

            const query = `
    WITH total AS (
        SELECT COUNT(*) AS totalCount FROM ${this.tableName}
    )
    SELECT t.*, total.totalCount
    FROM ${this.tableName} t, total
    LIMIT ? OFFSET ?
`;

            const result = await con.query<(T & { totalCount: number })[]>(query, [perPage, startIndex]);

            // result enthält jetzt sowohl die paginierten Ergebnisse als auch die Gesamtanzahl

            // Extrahiere die Gesamtanzahl der Einträge
            const totalCount = result.length > 0 ? result[0].totalCount : 0;

            const cleanedResult: T[] = result.map(({ totalCount, ...rest }) => rest as T);

            return { data: cleanedResult, totalCount: totalCount };
        } catch (err) {
            console.error(`Failed to get part of data from ${this.tableName}:`, err);
            throw new DBError(err, "get");
        } finally {
            con?.release();
        }
    }

    public static initialize() {
        if (!checkEnvVariables()) {
            throw new Error("Environment variables not set");
        }

        return mariadb.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            connectionLimit: 50,
            bigIntAsNumber: true,
        });
    }

    /* c8 ignore next 4 */
    [Symbol.dispose]() {
        this.pool.end();
        console.log("Database connection closed");
    }
}






export default DatabaseService;
