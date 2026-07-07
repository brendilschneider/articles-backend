import { ArticleEntity } from "src/modules/article/article.entity";

export type ArticleType = Omit<ArticleEntity, 'updateTimestamp'>;