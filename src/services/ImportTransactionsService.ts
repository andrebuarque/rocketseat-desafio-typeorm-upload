import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { getCustomRepository, getRepository, In } from 'typeorm';

import uploadConfig from '../config/upload';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface CsvLine {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(fileName: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    // ler arquivo
    const filePath = path.join(uploadConfig.directory, fileName);
    const transactionsReadStream = fs.createReadStream(filePath);

    const parser = csvParse({ from_line: 2 });
    const parse = transactionsReadStream.pipe(parser);

    const transactions: CsvLine[] = [];
    const categories: string[] = [];

    parse.on('data', line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parse.on('end', resolve));

    // importar categorias
    const importedCategories = await this.importCategories(categories);

    // importar transacoes
    const importedTransactions = await transactionsRepository.save(
      transactions.map(transaction => {
        const { title, type, value } = transaction;
        return transactionsRepository.create({
          title,
          type,
          value,
          category: importedCategories.find(
            category => category.title === transaction.category,
          ),
        });
      }),
    );

    // deletar arquivo
    await fs.promises.unlink(filePath);

    return importedTransactions;
  }

  private async importCategories(categories: string[]): Promise<Category[]> {
    const categoriesRepository = getRepository(Category);
    const existingCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existingCategoriesTitles = existingCategories.map(
      category => category.title,
    );

    const newCategoriesTitles = categories
      .filter(category => !existingCategoriesTitles.includes(category))
      .filter((value, index, array) => array.indexOf(value) === index);

    const newCategories = await categoriesRepository.save(
      newCategoriesTitles.map(category =>
        categoriesRepository.create({ title: category }),
      ),
    );

    return [...existingCategories, ...newCategories];
  }
}

export default ImportTransactionsService;
