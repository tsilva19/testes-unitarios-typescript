import { ICarsRepository } from '@modules/cars/repositories/ICarsRepository';
import { Rental } from '@modules/rentals/infra/typeorm/entities/Rental';
import { IRentalsRepository } from '@modules/rentals/repositories/IRentalsRepository';
import { IDateProvider } from '@shared/container/providers/DateProvider/IDateProvider';
import { AppError } from '@shared/errors/AppError';
import { inject, injectable } from 'tsyringe';

interface IRequest {
    id: string;
    user_id: string;
}

@injectable()
class DevolutionRentalUseCase {
    constructor(
        @inject('RentalsRepository')
        private rentalsRepository: IRentalsRepository,
        @inject('DayjsDateProvider')
        private dateProvider: IDateProvider,
        @inject('CarsRepository')
        private carsRepository: ICarsRepository
    ) {}

    async execute({ id, user_id }: IRequest): Promise<Rental> {
        const rental = await this.rentalsRepository.findById(id);
        const car = await this.carsRepository.findById(rental.car_id);
        const minimunDaily = 1;
        let total = 0;

        if (rental.end_date !== null) {
            throw new AppError('The car is not rented');
        }

        if (!rental) {
            throw new AppError('Rental does not exists!');
        }
        //Verificar o tempo de aluguel
        const dateNow = this.dateProvider.dateNow();

        let daily = this.dateProvider.compareInDays(rental.start_date, dateNow);
        if (daily < minimunDaily) {
            daily = minimunDaily;
        }
        const delay = this.dateProvider.compareInDays(
            dateNow,
            rental.expected_return_date
        );

        if (delay > 0) {
            const calculate_fine = delay * car.fine_amount;
            total += calculate_fine;
        }
        total += daily * car.daily_rate;
        rental.end_date = dateNow;
        rental.total = total;

        await this.rentalsRepository.create(rental);
        await this.carsRepository.updateAvailable(car.id, true);
        return rental;
    }
}
export { DevolutionRentalUseCase };
