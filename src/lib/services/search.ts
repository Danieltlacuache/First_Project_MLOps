import { and, between, count, eq, exists, or, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { annotations, categories, images } from '@/db/schema';

// Gramática (AND liga más fuerte que OR, estándar):
//   expr  := andExpr (OR andExpr)*
//   andExpr := term (AND term)*
//   term  := '(' expr ')' | CATEGORIA
type Token = { type: 'AND' | 'OR' | 'LPAREN' | 'RPAREN' | 'TERM'; value?: string };

function tokenizeQuery(query: string): Token[] {
  const tokens: Token[] = [];
  for (const raw of query.match(/\(|\)|[^\s()]+/g) ?? []) {
    if (raw === '(') tokens.push({ type: 'LPAREN' });
    else if (raw === ')') tokens.push({ type: 'RPAREN' });
    else if (raw === 'AND') tokens.push({ type: 'AND' });
    else if (raw === 'OR') tokens.push({ type: 'OR' });
    else tokens.push({ type: 'TERM', value: raw });
  }
  return tokens;
}

function categoryExists(term: string): SQL {
  return exists(
    db
      .select()
      .from(annotations)
      .innerJoin(categories, eq(annotations.categoryId, categories.id))
      .where(and(eq(annotations.imageId, images.id), eq(categories.name, term))),
  );
}

export function parseQuery(query: string): SQL {
  const tokens = tokenizeQuery(query);
  const pos = { i: 0 };

  const parseTerm = (): SQL => {
    const token = tokens[pos.i];
    if (!token) throw new Error('Consulta incompleta: se esperaba un término o "("');
    if (token.type === 'LPAREN') {
      pos.i++;
      const expr = parseOr();
      if (tokens[pos.i]?.type !== 'RPAREN') throw new Error('Falta ")" en la consulta');
      pos.i++;
      return expr;
    }
    if (token.type === 'TERM') {
      pos.i++;
      return categoryExists(token.value as string);
    }
    throw new Error(`Token inesperado en la consulta: ${token.type}`);
  };

  const parseAnd = (): SQL => {
    let left = parseTerm();
    while (tokens[pos.i]?.type === 'AND') {
      pos.i++;
      left = and(left, parseTerm()) as SQL;
    }
    return left;
  };

  const parseOr = (): SQL => {
    let left = parseAnd();
    while (tokens[pos.i]?.type === 'OR') {
      pos.i++;
      left = or(left, parseAnd()) as SQL;
    }
    return left;
  };

  const result = parseOr();
  if (pos.i < tokens.length) throw new Error('Token sobrante al final de la consulta');
  return result;
}

export async function searchImages(params: {
  query?: string; // Ej: "car AND (person OR bike)"
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  limit: number;
}) {
  const conditions: SQL[] = [];

  // 1. Rango de Fechas combinable
  if (params.dateFrom && params.dateTo) {
    conditions.push(between(images.createdAt, params.dateFrom, params.dateTo));
  }

  // 2. Operadores lógicos AND / OR / () resueltos puramente en SQL (Subqueries EXISTS)
  if (params.query) {
    conditions.push(parseQuery(params.query));
  }

  const offset = (params.page - 1) * params.limit;

  // 3. Ejecutar consulta principal paginada
  const data = await db
    .select()
    .from(images)
    .where(and(...conditions))
    .limit(params.limit)
    .offset(offset);

  // 4. Conteo total para la paginación correcta
  const [totalRecord] = await db
    .select({ value: count() })
    .from(images)
    .where(and(...conditions));

  const total = totalRecord?.value ?? 0;

  return {
    data,
    meta: {
      total: total,
      page: params.page,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}
