import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ArticleService } from './article.service';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { CreateArticleDTO } from 'src/common/DTO/article.dto';
import { User } from 'src/common/decorators/user.decorator';
import { UserEntity } from '../user/user.entity';
import { ArticleResponseInterface } from 'src/common/types/articleResponse.interface';
import { ArticlesResponseInterface } from 'src/common/types/articlesResponse.interface';

@Controller('articles')
export class ArticleController {

    constructor( private readonly articleService: ArticleService){}

    @Get()
    async findAll(@User('id') currentUserId: number, @Query() query: any): Promise<ArticlesResponseInterface> {
        return await this.articleService.findAll(currentUserId, query);
    }

    @Post()
    @UseGuards(AuthGuard)
    async create(@User() currentUser: UserEntity,  
    @Body('article') createArticleDTO: CreateArticleDTO): Promise<ArticleResponseInterface> {
        const article = await this.articleService.createArticle(currentUser, createArticleDTO);
        return this.articleService.buildArticleResponse(article);
    } 
    
    @Get(':slug')
    async getSingleArticle(@Param('slug') slug:string): Promise<ArticleResponseInterface> {
        const article = await this.articleService.findBySlug(slug);
        return this.articleService.buildArticleResponse(article);
    }

    @Delete(':slug')
    @UseGuards(AuthGuard)
    async deleteArticle(@User('id') currentUserId: number, @Param('slug') slug: string ) {
        return await this.articleService.deleteArticle(slug, currentUserId);
    }

    @Put(':slug')
    @UseGuards(AuthGuard)
    @UsePipes(new ValidationPipe())
    async updateArticle(
        @User('id') currentUserId: number, 
        @Param('slug')slug: string, 
        @Body('article') updateArticleDTO: CreateArticleDTO) {
        const article = await this.articleService.updateArticle(slug, updateArticleDTO, currentUserId);
        return this.articleService.buildArticleResponse(article);
    }

    @Post('slug/favorite')
    @UseGuards(AuthGuard)
    async addArticleToFavorites(@User('id') currentUserID, @Param('slug') slug: string): Promise<ArticleResponseInterface> {
        const article = await this.articleService.addArticleToFavorites(slug, currentUserID);
        return this.articleService.buildArticleResponse(article);
    }

    @Delete('slug/favorite')
    @UseGuards(AuthGuard)
    async deleteArticleToFavorites(@User('id') currentUserID, @Param('slug') slug: string): Promise<ArticleResponseInterface> {
        const article = await this.articleService.deleteArticleFromFavorites(slug, currentUserID);
        return this.articleService.buildArticleResponse(article);
    }
    
}
