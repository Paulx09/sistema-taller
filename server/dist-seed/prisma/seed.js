"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeed = runSeed;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
function runSeed() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Iniciando seed de la base de datos...');
        const passwordHash = yield bcrypt_1.default.hash('admin123', 10);
        const admin = yield prisma.usuario.upsert({
            where: { username: 'admin' },
            update: {
                passwordHash,
                nombreCompleto: 'Administrador del Sistema',
                rol: 'ADMIN',
            },
            create: {
                username: 'admin',
                passwordHash,
                nombreCompleto: 'Administrador del Sistema',
                rol: 'ADMIN',
            },
        });
        console.log('Usuario admin creado/actualizado - ID:', admin.id);
        console.log('Username:', admin.username);
        console.log('Password: admin123');
        console.log('Nombre:', admin.nombreCompleto);
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield runSeed();
            console.log('Seed ejecutado correctamente.');
        }
        catch (error) {
            console.error('Error en el seed:', error);
            process.exit(1);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
void main();
