// import AppError from '../errors/AppError';
import { getCustomRepository } from 'typeorm';

import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const findTransaction = await transactionsRepository.findOne(id);

    if (!findTransaction) {
      throw new AppError('Transaction not found.');
    }

    await transactionsRepository.remove(findTransaction);
  }
}

export default DeleteTransactionService;
