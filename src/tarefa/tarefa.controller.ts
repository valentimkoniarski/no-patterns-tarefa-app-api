import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { TarefaDto, TarefaService } from './tarefa.service';

@Controller('tarefas')
export class TarefaController {
  constructor(private service: TarefaService) {}

  @Post()
  criar(@Body() dto: TarefaDto) {
    return this.service.criarTarefa(dto);
  }

  @Put(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: TarefaDto) {
    return this.service.atualizarTarefa(id, dto);
  }

  @Patch(':id/concluir')
  concluir(@Param('id', ParseIntPipe) id: number) {
    return this.service.concluirTarefa(id);
  }

  @Post(':id/iniciar')
  iniciar(@Param('id', ParseIntPipe) id: number) {
    return this.service.iniciarTarefa(id);
  }

  @Get(':id/sumario')
  obterSumario(@Param('id', ParseIntPipe) id: number) {
    return this.service.obterSumario(id);
  }

  @Delete(':id')
  apagar(@Param('id', ParseIntPipe) id: number) {
    return this.service.apagarTarefa(id);
  }
}
