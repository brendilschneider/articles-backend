import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CreateArticleDTO } from 'src/common/DTO/article.dto';
import { ArticleEntity } from './article.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../user/user.entity';
import { ArticleResponseInterface } from 'src/common/types/articleResponse.interface';
import slugify from 'slugify';
import { DeleteResult } from 'typeorm/browser';
import { ArticlesResponseInterface } from 'src/common/types/articlesResponse.interface';

@Injectable()
export class ArticleService {

    constructor(
    @InjectRepository(ArticleEntity) 
    private readonly articleRepository: Repository<ArticleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly dataSource: DataSource){}

    async findAll(currentUserId: number, query: any): Promise<ArticlesResponseInterface> {
        const queryBuilder = this.dataSource
        .getRepository(ArticleEntity)
        .createQueryBuilder('articles')
        .leftJoinAndSelect('articles.author', 'author');

        if (query.tag) {
            queryBuilder.andWhere('articles.tagList LIKE :tag', {
                tag: `%${query.tag}`,
            });
        }

        if(query.author) {
            const author = await this.userRepository.findOne({
                where: {
                    username: query.author
                }
            })
            queryBuilder.andWhere('articles.authorId = :id', {
                id: author?.id
            })
        }

        if (query.favorited) {
            const author = await this.userRepository.findOne({
                where: {
                    username: query.favorited,
                },
                relations: {
                    favorites: true
                }
            });
            const ids = author?.favorites.map((el)=>el.id);
            if(ids && ids.length > 0) {
                queryBuilder.andWhere('articles.authorId IN (:...ids)', {ids});
            } else {
                queryBuilder.andWhere('1=0'); // Retorna un arreglo vacio
            }   
        }

        queryBuilder.orderBy('articles.createdAt', 'DESC');

        const articlesCount = await queryBuilder.getCount();

        if (query.limit) {
            queryBuilder.limit(query.limit);
        }

        if (query.offset) {
            queryBuilder.offset(query.offset);
        }

        let favoriteIds: number[] = [];
        if(currentUserId) {
            const currentUser = await this.userRepository.findOne({
                where: { id: currentUserId},
                relations: {favorites: true}
            });
            favoriteIds = currentUser?.favorites.map((favorite) => favorite.id)??[];
        }

        const articles = await queryBuilder.getMany();
        const articlesWithFavorited = articles.map(article => {
            const favorited = favoriteIds.includes(article.id);
            return {... article, favorited};
        })

        return {articles: articlesWithFavorited, articlesCount};
    }

    async createArticle( currentUser: UserEntity, createArticleDTO: CreateArticleDTO): Promise<ArticleEntity> {
        const article = new ArticleEntity();
        Object.assign(article, createArticleDTO);
        if (!article.tagList){
            article.tagList = [];
        }
        article.slug = this.getSlug(article.title) ;
        article.author = currentUser;
        return await this.articleRepository.save(article);
    }


    buildArticleResponse(article: ArticleEntity): ArticleResponseInterface {
        return {article};
    }

    private getSlug(title:string): string {
        return (
            slugify(title, {lower: true}) +
            '-' +
            ((Math.random() * Math.pow(36,6)) | 0 ).toString(36)
        );
    }
    
    async findBySlug(slug:string): Promise<ArticleEntity> {
       const article = await this.articleRepository.findOne({where: {slug}});
        if (!article) {
           throw new HttpException('Article does not exist', HttpStatus.NOT_FOUND);
        }
        return article;
    }

    async deleteArticle( slug: string, currentUserId: number): Promise<DeleteResult> {
        const article = await this.findBySlug(slug); 
        if(article.author.id !== currentUserId) {
           throw new HttpException('You are not an author', HttpStatus.FORBIDDEN);
        }
        return await this.articleRepository.delete({slug});
    }

    async updateArticle(slug: string, updateArticleDTO: CreateArticleDTO, currentUserId: number): Promise<ArticleEntity> {
        const article = await this.findBySlug(slug); 
        if(article.author.id !== currentUserId) {
           throw new HttpException('You are not an author', HttpStatus.FORBIDDEN);
        }
        Object.assign(article, updateArticleDTO);
        return await this.articleRepository.save(article);
    }

    async addArticleToFavorites(slug: string, userId: number): Promise<ArticleEntity> {
        const article = await this.findBySlug(slug);
        const user = await this.userRepository.findOne({
            where: {id: userId},
            relations: {
                favorites: true
            }
        });

        const isNotFavorited = user?.favorites.findIndex(articleInFavorites => articleInFavorites.id === article.id) === -1;

        if(isNotFavorited) {
            user.favorites.push(article);
            article.favoritesCount ++;
            await this.userRepository.save(user);
            await this.articleRepository.save(article);
        }

        return article;
    }

    async deleteArticleFromFavorites(slug: string, userId: number):Promise<ArticleEntity>{
        const article = await this.findBySlug(slug);
        const user = await this.userRepository.findOne({
            where: {id: userId},
            relations: {
                favorites: true
            }
        });

        const articleIndex = user?.favorites.findIndex(articleInFavorites => articleInFavorites.id === article.id);

        if (user && articleIndex !== undefined && articleIndex >= 0) {
            user?.favorites.splice(articleIndex, 1);
            article.favoritesCount--;
            await this.userRepository.save(user);
            await this.articleRepository.save(article);
        }

        return article;
    }
}
