import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { TarefaService } from './tarefa.service';
import { TarefaDTO } from './tarefa.dto';

@Controller('tarefas')
export class TarefaController {
  constructor(private service: TarefaService) {}

  @Post()
  criar(@Body() dto: TarefaDTO) {
    return this.service.criar(dto);
  }

  @Get()
  listar() {
    return this.service.findAll();
  }

  @Get(':id')
  detalhes(@Param('id') id: string) {
    return this.service.findAll();
  }

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() dto: TarefaDTO) {
    return this.service.atualizar(+id, dto);
  }

  @Delete(':id')
  excluir(@Param('id') id: string) {
    return this.service.excluir(+id);
  }
}
