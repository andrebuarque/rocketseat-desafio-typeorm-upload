import { getRepository, getCustomRepository } from 'typeorm';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';
// import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  categoryTitle: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    categoryTitle,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRespository = getRepository(Category);

    let category = await categoriesRespository.findOne({
      where: { title: categoryTitle },
    });

    if (!category) {
      category = categoriesRespository.create({
        title: categoryTitle,
      });
      await categoriesRespository.save(category);
    }

    const balance = await transactionsRepository.getBalance();

    if (type === 'outcome' && value > balance.total) {
      throw new AppError('This account does not have enough balance');
    }

    const transaction = await transactionsRepository.save({
      title,
      type,
      value,
      category_id: category.id,
    });

    return transaction;
  }
}

export default CreateTransactionService;
