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
import { CriarTarefaDto, TarefaService } from './tarefa.service';

@Controller('tarefas')
export class TarefaController {
  constructor(private service: TarefaService) {}

  @Post()
  criar(@Body() dto: CriarTarefaDto) {
    return this.service.criarTarefa(dto);
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
}
